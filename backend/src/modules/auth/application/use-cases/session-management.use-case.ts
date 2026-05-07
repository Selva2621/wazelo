import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SessionRepository } from '../../infrastructure/repositories/session.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  expiresAt: Date;
}

@Injectable()
export class SessionManagementUseCase {
  private readonly logger = new Logger(SessionManagementUseCase.name);

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listActiveSessions(
    userId: string,
    orgId: string,
  ): Promise<SessionInfo[]> {
    const sessions =
      await this.sessionRepository.findActiveSessionsByUserId(userId);

    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  async revokeSession(
    sessionId: string,
    userId: string,
    orgId: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const sessions =
      await this.sessionRepository.findActiveSessionsByUserId(userId);

    // Regular users can only revoke their own sessions.
    // Admins can revoke any session within their org.
    const targetSession = await this.findSessionForRevocation(
      sessionId,
      userId,
      orgId,
      role,
    );

    if (!targetSession) {
      throw new NotFoundException('Session not found');
    }

    await this.sessionRepository.revokeSession(sessionId);

    await this.auditService.log({
      orgId,
      userId,
      action: 'SESSION_REVOKED',
      targetType: 'Session',
      targetId: sessionId,
      metadata: {
        revokedByAdmin: role === 'ADMIN' && targetSession.userId !== userId,
      },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.SESSION_REVOKED, {
      sessionId,
      userId: targetSession.userId,
      orgId,
    });

    return { message: 'Session revoked successfully' };
  }

  async revokeAllSessions(
    userId: string,
    orgId: string,
    exceptRefreshToken?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string; count: number }> {
    const count =
      await this.sessionRepository.revokeAllUserSessions(userId);

    await this.auditService.log({
      orgId,
      userId,
      action: 'SESSION_REVOKED',
      targetType: 'User',
      targetId: userId,
      metadata: { revokeAll: true, count },
      ipAddress,
      userAgent,
    });

    return { message: 'All sessions revoked', count };
  }

  private async findSessionForRevocation(
    sessionId: string,
    userId: string,
    orgId: string,
    role: string,
  ) {
    if (role === 'ADMIN') {
      // Admin can revoke any session in their org
      const orgSessions =
        await this.sessionRepository.findActiveSessionsByOrgId(orgId);
      return orgSessions.find((s) => s.id === sessionId) || null;
    }

    // Regular user can only revoke their own sessions
    const userSessions =
      await this.sessionRepository.findActiveSessionsByUserId(userId);
    const session = userSessions.find((s) => s.id === sessionId);

    if (!session) {
      return null;
    }

    return session;
  }
}
