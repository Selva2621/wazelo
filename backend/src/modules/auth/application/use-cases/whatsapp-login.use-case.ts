import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, UserStatus } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { OrgRepository } from '@/modules/org/infrastructure/repositories/org.repository';
import { OrgStatusService } from '@/modules/org/domain/services/org-status.service';
import { orgSuspendedException } from '@/modules/org/interfaces/guards/org-status.guard';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import {
  OTP_MAX_ATTEMPTS,
  OTP_TEMPLATE,
  OTP_TTL_MS,
  canSendOtp,
  hashOtp,
  newOtpCode,
  otpMatches,
} from '@/modules/hq/domain/services/whatsapp-otp';
import { LoginCodeRepository } from '../../infrastructure/repositories/login-code.repository';
import { SessionIssuer } from '../services/session-issuer.service';
import type { LoginResult } from './login.use-case';

const DAY_MS = 24 * 60 * 60 * 1000;
const SENT = 'If this account has a verified WhatsApp number, we sent a sign-in code to it.';
const INVALID = 'Wrong or expired code';

/**
 * "Sign in with WhatsApp code": email in, a 6-digit code to the account's verified
 * WhatsApp number (sent from Wazelo HQ), code in, normal session out. Password sign-in
 * is untouched. Replies never reveal whether an account exists.
 */
@Injectable()
export class WhatsappLoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly orgs: OrgRepository,
    private readonly codes: LoginCodeRepository,
    private readonly orgStatus: OrgStatusService,
    private readonly sessionIssuer: SessionIssuer,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  async send(rawEmail: string): Promise<{ message: string }> {
    // Said up front for everyone (it reveals nothing about the account)
    if (!(await this.codes.hqCanSendCodes(OTP_TEMPLATE))) {
      throw new ServiceUnavailableException("WhatsApp sign-in isn't available right now. Sign in with your password.");
    }

    const user = await this.users.findByEmail(rawEmail.trim().toLowerCase());
    if (!user || !this.mayUseCode(user) || (await this.orgStatus.isSuspended(user.orgId))) return { message: SENT };

    // Over the resend / daily limit: quietly nothing (same reply)
    if (canSendOtp(await this.codes.sentSince(user.id, new Date(Date.now() - DAY_MS)))) return { message: SENT };

    const code = newOtpCode();
    const row = await this.codes.create({
      userId: user.id,
      codeHash: hashOtp(user.id, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });
    // Sent from Wazelo HQ's number by the HQ event handler (auth doesn't depend on HQ)
    this.events.emit(EVENT_NAMES.LOGIN_CODE_REQUESTED, { phone: user.phone!, code, idempotencyKey: `hq-login:${row.id}` });
    return { message: SENT };
  }

  async verify(rawEmail: string, code: string, rememberMe: boolean, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    const user = await this.users.findByEmail(rawEmail.trim().toLowerCase());
    if (!user || !this.mayUseCode(user)) throw new UnauthorizedException(INVALID);

    const open = await this.codes.latestOpen(user.id);
    if (!open || open.attempts >= OTP_MAX_ATTEMPTS) throw new UnauthorizedException(INVALID);
    if (!otpMatches(user.id, code, open.codeHash)) {
      await this.codes.addAttempt(open.id);
      throw new UnauthorizedException(INVALID);
    }
    if (!(await this.codes.markUsed(open.id))) throw new UnauthorizedException(INVALID);

    // Same gates as password sign-in
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Your account has been suspended. Contact your organization administrator.');
    }
    if (await this.orgStatus.isSuspended(user.orgId)) throw orgSuspendedException();

    await this.users.resetFailedAttempts(user.id);
    await this.users.updateLastLogin(user.id);
    const org = await this.orgs.findById(user.orgId);
    const tokens = await this.sessionIssuer.issue(user, { rememberMe, ipAddress, userAgent });

    await this.audit.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'User',
      targetId: user.id,
      metadata: { method: 'whatsapp_code' },
      ipAddress,
      userAgent,
    });
    this.events.emit(EVENT_NAMES.LOGIN_SUCCESS, { userId: user.id, orgId: user.orgId });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        orgId: user.orgId,
        orgType: org?.orgType,
      },
    };
  }

  /**
   * Only active accounts with a WhatsApp number they verified. Not HQ users opened
   * from the super admin portal, and not locked accounts (they wait out the lock).
   */
  private mayUseCode(user: User): boolean {
    if (!user.phone || !user.phoneVerifiedAt || user.superAdminId) return false;
    if (user.status === UserStatus.PENDING_VERIFICATION || user.status === UserStatus.SUSPENDED) return false;
    if (user.status === UserStatus.LOCKED && user.lockedUntil && user.lockedUntil > new Date()) return false;
    return true;
  }
}
