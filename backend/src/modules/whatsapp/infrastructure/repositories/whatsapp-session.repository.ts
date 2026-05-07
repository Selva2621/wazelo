import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { WhatsAppSessionStatus } from '@prisma/client';

export interface CreateSessionInput {
  orgId: string;
  userId: string;
  idempotencyKey?: string;
}

export interface UpdateSessionStatusInput {
  status: WhatsAppSessionStatus;
  phoneNumber?: string;
  encryptedCreds?: string;
  lastActiveAt?: Date;
  lastHeartbeatAt?: Date;
  reconnectCount?: number;
  disconnectedAt?: Date;
}

@Injectable()
export class WhatsAppSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSessionInput) {
    return this.prisma.whatsAppSession.create({
      data: {
        orgId: input.orgId,
        userId: input.userId,
        status: WhatsAppSessionStatus.CONNECTING,
        idempotencyKey: input.idempotencyKey || null,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdAndOrg(id: string, orgId: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async findAnyByUserId(userId: string, orgId: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: { userId, orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllSessionIdsByUserId(userId: string, orgId: string): Promise<string[]> {
    const sessions = await this.prisma.whatsAppSession.findMany({
      where: { userId, orgId },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map((s) => s.id);
  }

  async findActiveByUserId(userId: string, orgId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    return this.prisma.whatsAppSession.findFirst({
      where: {
        userId,
        orgId,
        deletedAt: null,
        OR: [
          { status: WhatsAppSessionStatus.CONNECTED },
          { status: WhatsAppSessionStatus.RECONNECTING, phoneNumber: { not: null } },
          { status: WhatsAppSessionStatus.CONNECTING, createdAt: { gt: fiveMinutesAgo } },
          // DISCONNECTED with creds intact — user should reconnect, not create a new session
          { status: WhatsAppSessionStatus.DISCONNECTED, encryptedCreds: { not: null } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Fallback: find any connected session in the org (for system-triggered messages) */
  async findAnyActiveByOrgId(orgId: string) {
    return this.prisma.whatsAppSession.findFirst({
      where: {
        orgId,
        deletedAt: null,
        status: WhatsAppSessionStatus.CONNECTED,
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  async findByIdempotencyKey(key: string) {
    return this.prisma.whatsAppSession.findUnique({
      where: { idempotencyKey: key },
    });
  }

  async updateStatus(id: string, input: UpdateSessionStatusInput) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.phoneNumber !== undefined && { phoneNumber: input.phoneNumber }),
        ...(input.encryptedCreds !== undefined && { encryptedCreds: input.encryptedCreds }),
        ...(input.lastActiveAt !== undefined && { lastActiveAt: input.lastActiveAt }),
        ...(input.lastHeartbeatAt !== undefined && { lastHeartbeatAt: input.lastHeartbeatAt }),
        ...(input.reconnectCount !== undefined && { reconnectCount: input.reconnectCount }),
        ...(input.disconnectedAt !== undefined && { disconnectedAt: input.disconnectedAt }),
      },
    });
  }

  async updateHeartbeat(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        lastHeartbeatAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
  }

  async incrementReconnectCount(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        reconnectCount: { increment: 1 },
        status: WhatsAppSessionStatus.RECONNECTING,
      },
    });
  }

  async softDelete(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: WhatsAppSessionStatus.DISCONNECTED,
        disconnectedAt: new Date(),
        deletedAt: new Date(),
        encryptedCreds: null,
      },
    });
  }

  async disconnectSession(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: WhatsAppSessionStatus.DISCONNECTED,
        disconnectedAt: new Date(),
        encryptedCreds: null,
      },
    });
  }

  // Soft disconnect — preserves encryptedCreds so reconnect works without a new QR scan.
  // Use this for natural disconnects (network loss, phone offline, health worker exhaustion).
  // Only use disconnectSession() for explicit mobile logout (creds must be wiped).
  async markAsDisconnected(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        status: WhatsAppSessionStatus.DISCONNECTED,
        disconnectedAt: new Date(),
      },
    });
  }

  async resetReconnectCount(id: string) {
    return this.prisma.whatsAppSession.update({
      where: { id },
      data: {
        reconnectCount: 0,
        status: WhatsAppSessionStatus.RECONNECTING,
        disconnectedAt: null,
      },
    });
  }

  async findByOrgIdPaginated(
    orgId: string,
    options: {
      status?: WhatsAppSessionStatus;
      userId?: string;
      page: number;
      limit: number;
    },
  ) {
    const where: Record<string, unknown> = {
      orgId,
      deletedAt: null,
    };
    if (options.status) where.status = options.status;
    if (options.userId) where.userId = options.userId;

    const [data, total] = await Promise.all([
      this.prisma.whatsAppSession.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.whatsAppSession.count({ where }),
    ]);

    const mapped = data.map(({ encryptedCreds, ...rest }) => ({
      ...rest,
      hasCreds: encryptedCreds !== null,
    }));

    return { data: mapped, total, page: options.page, limit: options.limit };
  }

  async findStaleConnectedSessions(heartbeatThreshold: Date) {
    return this.prisma.whatsAppSession.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [WhatsAppSessionStatus.CONNECTED, WhatsAppSessionStatus.RECONNECTING],
        },
        lastHeartbeatAt: { lt: heartbeatThreshold },
      },
    });
  }

  async countActiveByOrg(orgId: string) {
    return this.prisma.whatsAppSession.count({
      where: {
        orgId,
        deletedAt: null,
        status: { not: WhatsAppSessionStatus.DISCONNECTED },
      },
    });
  }

  async findByUserIds(userIds: string[], orgId: string) {
    return this.prisma.whatsAppSession.findMany({
      where: {
        userId: { in: userIds },
        orgId,
        deletedAt: null,
        status: { not: WhatsAppSessionStatus.DISCONNECTED },
      },
      select: {
        id: true,
        userId: true,
        phoneNumber: true,
        status: true,
      },
    });
  }

  async findAllActive() {
    return this.prisma.whatsAppSession.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [WhatsAppSessionStatus.CONNECTED, WhatsAppSessionStatus.RECONNECTING],
        },
        encryptedCreds: { not: null },
        phoneNumber: { not: null },
      },
      select: {
        id: true,
        userId: true,
        orgId: true,
        phoneNumber: true,
      },
    });
  }
}
