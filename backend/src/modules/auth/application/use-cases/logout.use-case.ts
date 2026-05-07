import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SessionRepository } from '../../infrastructure/repositories/session.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';

export interface LogoutResult {
  message: string;
}

@Injectable()
export class LogoutUseCase {
  private readonly logger = new Logger(LogoutUseCase.name);

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    refreshToken: string,
    userId: string,
    orgId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LogoutResult> {
    // Revoke the session associated with this refresh token (guard against missing cookie)
    if (refreshToken) {
      await this.sessionRepository.revokeSessionByToken(refreshToken);
    }

    // Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: 'LOGOUT',
      targetType: 'User',
      targetId: userId,
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.LOGOUT, { userId, orgId });

    return { message: 'Logged out successfully' };
  }
}
