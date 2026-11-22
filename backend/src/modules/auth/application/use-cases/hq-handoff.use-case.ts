import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { TokenType, UserStatus } from '@prisma/client';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { OrgStatusService } from '@/modules/org/domain/services/org-status.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { hashHqHandoffCode } from '@/shared/utils/hq-handoff';
import { TokenRepository } from '../../infrastructure/repositories/token.repository';
import { SessionIssuer } from '../services/session-issuer.service';

const INVALID = 'This Wazelo HQ link has expired or was already used. Open HQ again from the super admin portal.';

/**
 * Trades the one-time code from the super admin portal ("Open Wazelo HQ") for a normal
 * tenant session of that super admin's HQ user. Single use, 60s, HQ users only.
 */
@Injectable()
export class ExchangeHqHandoffUseCase {
  private readonly logger = new Logger(ExchangeHqHandoffUseCase.name);

  constructor(
    private readonly tokenRepository: TokenRepository,
    private readonly userRepository: UserRepository,
    private readonly orgStatus: OrgStatusService,
    private readonly sessionIssuer: SessionIssuer,
    private readonly auditService: AuditService,
  ) {}

  async execute(code: string, ipAddress?: string, userAgent?: string): Promise<{ refreshToken: string }> {
    const userId = code ? await this.tokenRepository.consume(hashHqHandoffCode(code), TokenType.HQ_HANDOFF) : null;
    if (!userId) throw new UnauthorizedException(INVALID);

    const user = await this.userRepository.findById(userId);
    // Only a super admin's HQ user, still active, in a live HQ org
    if (
      !user ||
      user.deletedAt ||
      !user.superAdminId ||
      user.status !== UserStatus.ACTIVE ||
      !(await this.orgStatus.isInternal(user.orgId)) ||
      (await this.orgStatus.isSuspended(user.orgId))
    ) {
      this.logger.warn(`HQ handoff refused for user ${userId}`);
      throw new UnauthorizedException(INVALID);
    }

    await this.userRepository.updateLastLogin(user.id);
    const tokens = await this.sessionIssuer.issue(user, { rememberMe: false, ipAddress, userAgent });

    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'User',
      targetId: user.id,
      metadata: { method: 'super_admin_hq_handoff', superAdminId: user.superAdminId },
      ipAddress,
      userAgent,
    });

    return { refreshToken: tokens.refreshToken };
  }
}
