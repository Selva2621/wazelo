import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '@/modules/auth/domain/services/token.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/ws',
})
export class AppWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppWebSocketGateway.name);
  // Map of userId -> Set of socket IDs
  private readonly userSockets = new Map<string, Set<string>>();
  // Map of orgId -> Set of socket IDs (for org-wide broadcasts)
  private readonly orgSockets = new Map<string, Set<string>>();

  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new UnauthorizedException('Missing token');
      }

      const payload = await this.tokenService.verifyAccessToken(token);
      const userId = payload.sub;
      const orgId = payload.orgId;

      // Store socket mapping
      client.data.userId = userId;
      client.data.orgId = orgId;

      // Join user-specific room
      await client.join(`user:${userId}`);
      // Join org-specific room
      await client.join(`org:${orgId}`);

      // Track connections
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      if (!this.orgSockets.has(orgId)) {
        this.orgSockets.set(orgId, new Set());
      }
      this.orgSockets.get(orgId)!.add(client.id);

      // Persist online status + broadcast to org
      const wasOffline = !this.userSockets.has(userId) || this.userSockets.get(userId)!.size === 1;
      if (wasOffline) {
        this.prisma.user.update({
          where: { id: userId },
          data: { isOnline: true, lastSeenAt: new Date() },
        }).catch(() => {});
        this.server.to(`org:${orgId}`).emit('user:online', { userId });
      }

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.warn(`Client auth failed: ${client.id}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data?.userId;
    const orgId = client.data?.orgId;

    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
        // User fully offline — persist + broadcast
        this.prisma.user.update({
          where: { id: userId },
          data: { isOnline: false, lastSeenAt: new Date() },
        }).catch(() => {});
        if (orgId) {
          this.server.to(`org:${orgId}`).emit('user:offline', { userId });
        }
      }
    }

    if (orgId && this.orgSockets.has(orgId)) {
      this.orgSockets.get(orgId)!.delete(client.id);
      if (this.orgSockets.get(orgId)!.size === 0) {
        this.orgSockets.delete(orgId);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Join a session-specific room (for targeted message events).
   * Called when a WhatsApp session is created/connected.
   */
  joinSessionRoom(userId: string, sessionId: string): void {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(`session:${sessionId}`);
        }
      }
    }
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToOrg(orgId: string, event: string, data: unknown): void {
    this.server.to(`org:${orgId}`).emit(event, data);
  }

  emitToSession(sessionId: string, event: string, data: unknown): void {
    this.server.to(`session:${sessionId}`).emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}
