import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcrypt';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import { PlatformAuditAction, SuperAdmin } from '@prisma/client';
import { EncryptionService } from '@/common/services/encryption.service';
import { PlatformAuditService, RequestMeta } from '../services/platform-audit.service';
import { SuperAdminRepository } from '../../infrastructure/repositories/super-admin.repository';
import { SuperAdminSessionRepository } from '../../infrastructure/repositories/super-admin-session.repository';
import {
  REFRESH_EXPIRY_MS,
  SuperAdminTokenPayload,
  SuperAdminTokenService,
} from '../../domain/services/super-admin-token.service';
import { TotpService } from '../../domain/services/totp.service';
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  isRecoveryCodeFormat,
} from '../../domain/services/recovery-codes';
import { SuperAdminLoginDto } from '../dto/super-admin-auth.dto';

/**
 * A rotated refresh token is still honoured this long, so two tabs refreshing with the
 * same cookie don't log each other out. Beyond it, a rotated token coming back was copied.
 */
const ROTATION_GRACE_MS = 30_000;

/**
 * A real bcrypt hash at the seed script's cost, compared against when the email is unknown,
 * so that path costs the same as a wrong password. Built once, on first use.
 */
const BCRYPT_COST = 12;
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHash ??= hash(randomUUID(), BCRYPT_COST);
  return dummyHash;
}

export interface SuperAdminProfile {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled: boolean;
  /** 2FA is mandatory on this deployment — the UI hides "disable" */
  twoFactorRequired: boolean;
  recoveryCodesRemaining: number;
  lastLoginAt: Date | null;
}

export interface SuperAdminSession {
  accessToken: string;
  expiresIn: number;
  /** Set as an HttpOnly cookie by the controller — never returned in the body. Absent on the
   *  refresh grace path: the browser already holds the newer cookie. */
  refreshToken?: string;
  superAdmin: SuperAdminProfile;
}

type NoStep = { requiresTwoFactor: false; requiresTwoFactorSetup: false; requiresPasswordChange: false };

export type SuperAdminLoginResult =
  | (NoStep & SuperAdminSession)
  /** Account has 2FA: enter a code (or a recovery code) */
  | (Omit<NoStep, 'requiresTwoFactor'> & { requiresTwoFactor: true; challengeToken: string })
  /** 2FA is mandatory and this account has none yet: enrol first */
  | (Omit<NoStep, 'requiresTwoFactorSetup'> & { requiresTwoFactorSetup: true; challengeToken: string })
  /** Created with a temporary password: choose a new one first */
  | (Omit<NoStep, 'requiresPasswordChange'> & { requiresPasswordChange: true; challengeToken: string });

/** 12–128 characters; anything else is the user's choice (length beats composition rules). */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;
const BCRYPT_COST_REAL = 12;

export interface TwoFactorSetupInfo {
  secret: string;
  otpAuthUrl: string;
  qrCodeDataUrl: string;
}

export interface ActiveSuperAdminSession {
  /** The session family id — stable across refreshes; pass it to revoke */
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: Date;
  current: boolean;
}

/** Reads the deployment's super admin auth policy. */
@Injectable()
export class SuperAdminAuthPolicy {
  readonly require2fa: boolean;
  readonly maxFailedAttempts: number;
  readonly lockMinutes: number;

  constructor(config: ConfigService) {
    this.require2fa = config.get<boolean>('auth.superAdminRequire2fa', true);
    this.maxFailedAttempts = config.get<number>('auth.superAdminMaxFailedAttempts', 5);
    this.lockMinutes = config.get<number>('auth.superAdminLockMinutes', 15);
  }

  toProfile(superAdmin: SuperAdmin): SuperAdminProfile {
    return {
      id: superAdmin.id,
      name: superAdmin.name,
      email: superAdmin.email,
      twoFactorEnabled: superAdmin.totpEnabled,
      twoFactorRequired: this.require2fa,
      recoveryCodesRemaining: superAdmin.recoveryCodes?.length ?? 0,
      lastLoginAt: superAdmin.lastLoginAt,
    };
  }
}

function actorOf(superAdmin: SuperAdmin) {
  return { id: superAdmin.id, email: superAdmin.email };
}

/** Creates a session row and the matching access + refresh tokens. */
@Injectable()
export class SuperAdminSessionIssuer {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly sessionRepo: SuperAdminSessionRepository,
    private readonly tokenService: SuperAdminTokenService,
    private readonly audit: PlatformAuditService,
    private readonly policy: SuperAdminAuthPolicy,
  ) {}

  /** A completed sign-in: clears the lockout counter, audits, starts a new session family. */
  async signIn(
    superAdmin: SuperAdmin,
    meta: RequestMeta,
    metadata: Record<string, unknown> = {},
  ): Promise<SuperAdminSession> {
    await this.superAdminRepo.recordLogin(superAdmin.id);
    const session = await this.issue(superAdmin, meta);
    await this.audit.record({
      action: PlatformAuditAction.SUPER_ADMIN_LOGIN,
      actor: actorOf(superAdmin),
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      metadata: { twoFactor: superAdmin.totpEnabled, ...metadata },
      meta,
    });
    return session;
  }

  /** @param familyId omit for a new sign-in; pass it to rotate within an existing session */
  async issue(superAdmin: SuperAdmin, meta: RequestMeta, familyId: string = randomUUID()): Promise<SuperAdminSession> {
    const sessionId = randomUUID();
    const [{ accessToken, expiresIn }, refreshToken] = await Promise.all([
      this.tokenService.generateAccessToken(superAdmin, familyId),
      this.tokenService.generateRefreshToken(superAdmin, familyId, sessionId),
    ]);
    await this.sessionRepo.create({
      id: sessionId,
      superAdminId: superAdmin.id,
      refreshToken,
      familyId,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });
    return { accessToken, expiresIn, refreshToken, superAdmin: this.policy.toProfile(superAdmin) };
  }
}

/**
 * Per-account lockout. Password and 2FA failures share one counter; reaching the limit
 * locks the account for `lockMinutes`, independent of the per-IP throttle.
 */
@Injectable()
export class SuperAdminLockout {
  private readonly logger = new Logger(SuperAdminLockout.name);

  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly audit: PlatformAuditService,
    private readonly policy: SuperAdminAuthPolicy,
  ) {}

  assertNotLocked(superAdmin: SuperAdmin): void {
    if (superAdmin.lockedUntil && superAdmin.lockedUntil > new Date()) {
      const minutes = Math.ceil((superAdmin.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Too many failed attempts. Account locked — try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      );
    }
  }

  async recordFailure(superAdmin: SuperAdmin, reason: string, meta: RequestMeta): Promise<void> {
    const updated = await this.superAdminRepo.incrementFailedAttempts(superAdmin.id);
    await this.audit.record({
      action: PlatformAuditAction.SUPER_ADMIN_LOGIN_FAILED,
      actor: actorOf(superAdmin),
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      metadata: { email: superAdmin.email, reason, failedAttempts: updated.failedLoginAttempts },
      meta,
    });
    if (updated.failedLoginAttempts < this.policy.maxFailedAttempts) return;

    const lockedUntil = new Date(Date.now() + this.policy.lockMinutes * 60_000);
    await this.superAdminRepo.lock(superAdmin.id, lockedUntil);
    this.logger.warn(`Super admin ${superAdmin.id} locked until ${lockedUntil.toISOString()}`);
    await this.audit.record({
      action: PlatformAuditAction.SUPER_ADMIN_LOCKED,
      actor: actorOf(superAdmin),
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      metadata: { lockedUntil: lockedUntil.toISOString(), afterAttempts: updated.failedLoginAttempts },
      meta,
    });
  }
}

/**
 * Checks a second factor: a TOTP code (each time step usable once) or, when `allowRecovery`,
 * a one-time recovery code (consumed on success).
 */
@Injectable()
export class SuperAdminSecondFactor {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly totpService: TotpService,
    private readonly encryption: EncryptionService,
    private readonly audit: PlatformAuditService,
  ) {}

  async verify(
    superAdmin: SuperAdmin,
    code: string,
    meta: RequestMeta,
    allowRecovery = false,
  ): Promise<'totp' | 'recovery' | null> {
    if (allowRecovery && isRecoveryCodeFormat(code)) {
      const used = await this.superAdminRepo.consumeRecoveryCode(superAdmin.id, hashRecoveryCode(code));
      if (!used) return null;
      await this.audit.record({
        action: PlatformAuditAction.TWO_FACTOR_RECOVERY_CODE_USED,
        actor: actorOf(superAdmin),
        targetType: 'SuperAdmin',
        targetId: superAdmin.id,
        metadata: { remaining: Math.max(0, (superAdmin.recoveryCodes?.length ?? 1) - 1) },
        meta,
      });
      return 'recovery';
    }
    const step = this.matchTotp(superAdmin, code);
    if (step === null) return null;
    return (await this.superAdminRepo.claimTotpStep(superAdmin.id, step)) ? 'totp' : null;
  }

  /** Matches without consuming the step — for enrolment, which claims it after enabling. */
  matchTotp(superAdmin: SuperAdmin, code: string): number | null {
    if (!superAdmin.totpSecret) return null;
    return this.totpService.matchStep(this.encryption.decrypt(superAdmin.totpSecret), code);
  }
}

@Injectable()
export class SuperAdminLoginUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly tokenService: SuperAdminTokenService,
    private readonly sessionIssuer: SuperAdminSessionIssuer,
    private readonly lockout: SuperAdminLockout,
    private readonly audit: PlatformAuditService,
    private readonly policy: SuperAdminAuthPolicy,
  ) {}

  async execute(dto: SuperAdminLoginDto, meta: RequestMeta = {}): Promise<SuperAdminLoginResult> {
    const superAdmin = await this.superAdminRepo.findByEmail(dto.email);
    if (!superAdmin) {
      // Same bcrypt cost as real hashes, so an unknown email takes as long as a wrong password
      await compare(dto.password, await getDummyHash());
      await this.audit.record({
        action: PlatformAuditAction.SUPER_ADMIN_LOGIN_FAILED,
        actor: null,
        targetType: 'SuperAdmin',
        metadata: { email: dto.email.toLowerCase(), reason: 'unknown_account' },
        meta,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await compare(dto.password, superAdmin.passwordHash);
    // Checked after the hash so a locked account answers in the same time
    this.lockout.assertNotLocked(superAdmin);
    if (!passwordValid) {
      await this.lockout.recordFailure(superAdmin, 'bad_password', meta);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (superAdmin.disabledAt) {
      throw new ForbiddenException('This account has been disabled. Ask another super admin to re-enable it.');
    }
    if (superAdmin.mustChangePassword) {
      const challengeToken = await this.tokenService.generateChallengeToken(superAdmin, 'password-change');
      return { requiresTwoFactor: false, requiresTwoFactorSetup: false, requiresPasswordChange: true, challengeToken };
    }
    return afterPassword(superAdmin, meta, this.tokenService, this.sessionIssuer, this.policy);
  }
}

/**
 * What follows a correct password: the 2FA step, 2FA enrolment, or (2FA off) a session.
 * The login is only recorded once every step has passed.
 */
async function afterPassword(
  superAdmin: SuperAdmin,
  meta: RequestMeta,
  tokenService: SuperAdminTokenService,
  sessionIssuer: SuperAdminSessionIssuer,
  policy: SuperAdminAuthPolicy,
): Promise<SuperAdminLoginResult> {
  const none = { requiresTwoFactor: false, requiresTwoFactorSetup: false, requiresPasswordChange: false } as const;
  if (superAdmin.totpEnabled) {
    const challengeToken = await tokenService.generateChallengeToken(superAdmin, '2fa');
    return { ...none, requiresTwoFactor: true, challengeToken };
  }
  if (policy.require2fa) {
    const challengeToken = await tokenService.generateChallengeToken(superAdmin, '2fa-setup');
    return { ...none, requiresTwoFactorSetup: true, challengeToken };
  }
  return { ...none, ...(await sessionIssuer.signIn(superAdmin, meta)) };
}

/** Loads the account behind a challenge token and checks it is still valid for that step. */
async function resolveChallenge(
  tokenService: SuperAdminTokenService,
  superAdminRepo: SuperAdminRepository,
  challengeToken: string,
  typ: '2fa' | '2fa-setup' | 'password-change',
): Promise<SuperAdmin> {
  let payload: SuperAdminTokenPayload;
  try {
    payload = await tokenService.verify(challengeToken, typ);
  } catch {
    throw new UnauthorizedException('Login session expired — sign in again');
  }
  const superAdmin = await superAdminRepo.findById(payload.sub);
  const stateOk =
    typ === '2fa' ? superAdmin?.totpEnabled
    : typ === '2fa-setup' ? !superAdmin?.totpEnabled
    : superAdmin?.mustChangePassword;
  if (!superAdmin || superAdmin.disabledAt || superAdmin.tokenVersion !== payload.tv || !stateOk) {
    throw new UnauthorizedException('Login session expired — sign in again');
  }
  return superAdmin;
}

@Injectable()
export class CompleteSuperAdminTwoFactorLoginUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly tokenService: SuperAdminTokenService,
    private readonly secondFactor: SuperAdminSecondFactor,
    private readonly lockout: SuperAdminLockout,
    private readonly sessionIssuer: SuperAdminSessionIssuer,
  ) {}

  /** `code` is a 6-digit TOTP code or a recovery code. */
  async execute(challengeToken: string, code: string, meta: RequestMeta = {}): Promise<SuperAdminSession> {
    const superAdmin = await resolveChallenge(this.tokenService, this.superAdminRepo, challengeToken, '2fa');
    this.lockout.assertNotLocked(superAdmin);

    const method = await this.secondFactor.verify(superAdmin, code, meta, true);
    if (!method) {
      await this.lockout.recordFailure(superAdmin, 'bad_2fa_code', meta);
      throw new UnauthorizedException('Invalid verification code');
    }
    const fresh = (await this.superAdminRepo.findById(superAdmin.id)) ?? superAdmin;
    return this.sessionIssuer.signIn(fresh, meta, { secondFactor: method });
  }
}

@Injectable()
export class RefreshSuperAdminSessionUseCase {
  private readonly logger = new Logger(RefreshSuperAdminSessionUseCase.name);

  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly sessionRepo: SuperAdminSessionRepository,
    private readonly tokenService: SuperAdminTokenService,
    private readonly sessionIssuer: SuperAdminSessionIssuer,
    private readonly audit: PlatformAuditService,
    private readonly policy: SuperAdminAuthPolicy,
  ) {}

  async execute(refreshToken: string, meta: RequestMeta = {}): Promise<SuperAdminSession> {
    const payload = await this.tokenService.verify(refreshToken, 'refresh');
    // Looked up in any state: a revoked/rotated hit is how races and reuse are told apart
    const session = await this.sessionRepo.findByRefreshTokenAnyState(refreshToken);
    if (!session || session.expiresAt <= new Date() || session.superAdminId !== payload.sub) {
      throw new UnauthorizedException('Session revoked');
    }
    const superAdmin = await this.superAdminRepo.findById(payload.sub);
    if (!superAdmin || superAdmin.disabledAt || superAdmin.tokenVersion !== payload.tv) {
      throw new UnauthorizedException('Session revoked');
    }

    if (session.revokedAt) {
      // Signed out on this device, or revoked from another one
      if (!session.rotatedAt) throw new UnauthorizedException('Session revoked');
      // A concurrent refresh lost the race moments ago: access token only, keep the newer cookie
      if (Date.now() - session.rotatedAt.getTime() <= ROTATION_GRACE_MS) {
        if (!(await this.sessionRepo.familyHasActiveSession(session.familyId))) {
          throw new UnauthorizedException('Session revoked');
        }
        const access = await this.tokenService.generateAccessToken(superAdmin, session.familyId);
        return { ...access, superAdmin: this.policy.toProfile(superAdmin) };
      }
      // A rotated token replayed later was copied: end that whole sign-in
      const revoked = await this.sessionRepo.revokeFamily(session.familyId);
      this.logger.warn(`Super admin refresh token reuse; family ${session.familyId} revoked (${revoked})`);
      await this.audit.record({
        action: PlatformAuditAction.SUPER_ADMIN_REFRESH_REUSED,
        actor: actorOf(superAdmin),
        targetType: 'SuperAdminSession',
        targetId: session.familyId,
        metadata: { sessionsRevoked: revoked },
        meta,
      });
      throw new UnauthorizedException('Session revoked');
    }

    // Atomic single-use claim: only one concurrent request may rotate this token
    if (!(await this.sessionRepo.claimForRotation(session.id))) {
      const access = await this.tokenService.generateAccessToken(superAdmin, session.familyId);
      return { ...access, superAdmin: this.policy.toProfile(superAdmin) };
    }
    return this.sessionIssuer.issue(superAdmin, meta, session.familyId);
  }
}

@Injectable()
export class LogoutSuperAdminUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly sessionRepo: SuperAdminSessionRepository,
    private readonly tokenService: SuperAdminTokenService,
    private readonly audit: PlatformAuditService,
  ) {}

  /** Signs out this device only: revokes the session family behind the refresh cookie. */
  async execute(refreshToken: string, meta: RequestMeta = {}): Promise<void> {
    let payload: SuperAdminTokenPayload;
    try {
      payload = await this.tokenService.verify(refreshToken, 'refresh');
    } catch {
      return; // Already expired or invalid — nothing left to revoke
    }
    const session = await this.sessionRepo.findByRefreshTokenAnyState(refreshToken);
    if (!session || session.superAdminId !== payload.sub) return;
    await this.sessionRepo.revokeFamily(session.familyId, payload.sub);
    await this.audit.record({
      action: PlatformAuditAction.SUPER_ADMIN_LOGOUT,
      actor: { id: payload.sub, email: payload.email },
      targetType: 'SuperAdminSession',
      targetId: session.familyId,
      meta,
    });
  }

  /** Signs out every device: bumps tokenVersion (kills all tokens) and revokes all sessions. */
  async everywhere(superAdminId: string, meta: RequestMeta = {}): Promise<void> {
    const superAdmin = await this.superAdminRepo.incrementTokenVersion(superAdminId);
    const revoked = await this.sessionRepo.revokeAll(superAdminId);
    await this.audit.record({
      action: PlatformAuditAction.SUPER_ADMIN_LOGOUT,
      actor: actorOf(superAdmin),
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      metadata: { everywhere: true, sessionsRevoked: revoked },
      meta,
    });
  }
}

@Injectable()
export class ListSuperAdminSessionsUseCase {
  constructor(private readonly sessionRepo: SuperAdminSessionRepository) {}

  async execute(superAdminId: string, currentFamilyId: string): Promise<ActiveSuperAdminSession[]> {
    const rows = await this.sessionRepo.findActive(superAdminId);
    // Normally one live row per family; keep the newest if a race left two
    const byFamily = new Map<string, ActiveSuperAdminSession>();
    for (const row of rows) {
      if (byFamily.has(row.familyId)) continue;
      byFamily.set(row.familyId, {
        id: row.familyId,
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
        lastActiveAt: row.createdAt,
        current: row.familyId === currentFamilyId,
      });
    }
    return [...byFamily.values()];
  }
}

@Injectable()
export class RevokeSuperAdminSessionUseCase {
  constructor(
    private readonly sessionRepo: SuperAdminSessionRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(actor: { id: string; email: string }, familyId: string, meta: RequestMeta = {}): Promise<void> {
    const revoked = await this.sessionRepo.revokeFamily(familyId, actor.id);
    if (revoked === 0) throw new NotFoundException('Session not found or already signed out');
    await this.audit.record({
      action: PlatformAuditAction.SUPER_ADMIN_SESSION_REVOKED,
      actor,
      targetType: 'SuperAdminSession',
      targetId: familyId,
      meta,
    });
  }
}

@Injectable()
export class GetSuperAdminProfileUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly policy: SuperAdminAuthPolicy,
  ) {}

  async execute(superAdminId: string): Promise<SuperAdminProfile> {
    const superAdmin = await this.superAdminRepo.findById(superAdminId);
    if (!superAdmin) throw new NotFoundException('Super admin not found');
    return this.policy.toProfile(superAdmin);
  }
}

@Injectable()
export class SetupSuperAdminTwoFactorUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly totpService: TotpService,
    private readonly encryption: EncryptionService,
    private readonly audit: PlatformAuditService,
  ) {}

  /**
   * Generates a new secret and stores it (encrypted, not yet enabled), replacing any
   * pending one. 2FA only turns on once a code is confirmed.
   */
  async execute(superAdminId: string, meta: RequestMeta = {}): Promise<TwoFactorSetupInfo> {
    const superAdmin = await this.superAdminRepo.findById(superAdminId);
    if (!superAdmin) throw new NotFoundException('Super admin not found');
    if (superAdmin.totpEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = this.totpService.generateSecret();
    await this.superAdminRepo.setTotp(superAdminId, this.encryption.encrypt(secret), false);
    await this.audit.record({
      action: PlatformAuditAction.TWO_FACTOR_SETUP_STARTED,
      actor: actorOf(superAdmin),
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      metadata: { replacedPendingSecret: !!superAdmin.totpSecret },
      meta,
    });

    const otpAuthUrl = this.totpService.buildOtpAuthUrl(secret, superAdmin.email);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    return { secret, otpAuthUrl, qrCodeDataUrl };
  }
}

@Injectable()
export class EnableSuperAdminTwoFactorUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly sessionRepo: SuperAdminSessionRepository,
    private readonly secondFactor: SuperAdminSecondFactor,
    private readonly audit: PlatformAuditService,
    private readonly policy: SuperAdminAuthPolicy,
  ) {}

  /** From the Security page. Other devices are signed out; this one stays. */
  async execute(
    superAdminId: string,
    currentFamilyId: string,
    code: string,
    meta: RequestMeta = {},
  ): Promise<{ profile: SuperAdminProfile; recoveryCodes: string[] }> {
    const superAdmin = await this.superAdminRepo.findById(superAdminId);
    if (!superAdmin) throw new NotFoundException('Super admin not found');
    const result = await this.enableFor(superAdmin, code, meta);
    await this.revokeOtherSessions(superAdminId, currentFamilyId);
    return { profile: this.policy.toProfile(result.superAdmin), recoveryCodes: result.recoveryCodes };
  }

  async enableFor(
    superAdmin: SuperAdmin,
    code: string,
    meta: RequestMeta,
  ): Promise<{ superAdmin: SuperAdmin; recoveryCodes: string[] }> {
    if (superAdmin.totpEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }
    if (!superAdmin.totpSecret) {
      throw new BadRequestException('Start two-factor setup first');
    }
    const step = this.secondFactor.matchTotp(superAdmin, code);
    if (step === null) {
      throw new BadRequestException('Invalid verification code');
    }
    const recoveryCodes = generateRecoveryCodes();
    const updated = await this.superAdminRepo.setTotp(
      superAdmin.id,
      superAdmin.totpSecret,
      true,
      recoveryCodes.map(hashRecoveryCode),
    );
    // The enrolment code can't be replayed as a login code
    await this.superAdminRepo.claimTotpStep(superAdmin.id, step);
    await this.audit.record({
      action: PlatformAuditAction.TWO_FACTOR_ENABLED,
      actor: actorOf(superAdmin),
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      meta,
    });
    return { superAdmin: updated, recoveryCodes };
  }

  private async revokeOtherSessions(superAdminId: string, keepFamilyId: string): Promise<void> {
    const active = await this.sessionRepo.findActive(superAdminId);
    const others = new Set(active.map((s) => s.familyId).filter((f) => f !== keepFamilyId));
    await Promise.all([...others].map((familyId) => this.sessionRepo.revokeFamily(familyId, superAdminId)));
  }
}

@Injectable()
export class DisableSuperAdminTwoFactorUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly secondFactor: SuperAdminSecondFactor,
    private readonly audit: PlatformAuditService,
    private readonly policy: SuperAdminAuthPolicy,
  ) {}

  async execute(superAdminId: string, code: string, meta: RequestMeta = {}): Promise<SuperAdminProfile> {
    if (this.policy.require2fa) {
      throw new BadRequestException('Two-factor authentication is required for super admins');
    }
    const superAdmin = await this.superAdminRepo.findById(superAdminId);
    if (!superAdmin) throw new NotFoundException('Super admin not found');
    if (!superAdmin.totpEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }
    if (!(await this.secondFactor.verify(superAdmin, code, meta))) {
      throw new BadRequestException('Invalid verification code');
    }
    const updated = await this.superAdminRepo.setTotp(superAdminId, null, false);
    await this.audit.record({
      action: PlatformAuditAction.TWO_FACTOR_DISABLED,
      actor: actorOf(superAdmin),
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      meta,
    });
    return this.policy.toProfile(updated);
  }
}

@Injectable()
export class RegenerateSuperAdminRecoveryCodesUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly secondFactor: SuperAdminSecondFactor,
    private readonly audit: PlatformAuditService,
  ) {}

  /** Replaces every recovery code. Needs a current TOTP code (not a recovery code). */
  async execute(superAdminId: string, code: string, meta: RequestMeta = {}): Promise<{ recoveryCodes: string[] }> {
    const superAdmin = await this.superAdminRepo.findById(superAdminId);
    if (!superAdmin) throw new NotFoundException('Super admin not found');
    if (!superAdmin.totpEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }
    if (!(await this.secondFactor.verify(superAdmin, code, meta))) {
      throw new BadRequestException('Invalid verification code');
    }
    const recoveryCodes = generateRecoveryCodes();
    await this.superAdminRepo.setRecoveryCodes(superAdminId, recoveryCodes.map(hashRecoveryCode));
    await this.audit.record({
      action: PlatformAuditAction.TWO_FACTOR_RECOVERY_CODES_REGENERATED,
      actor: actorOf(superAdmin),
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      meta,
    });
    return { recoveryCodes };
  }
}

// Enrolment depends on Setup/Enable above: declared last so decorator metadata resolves

/** Mandatory 2FA, step 1: an account without 2FA gets a new secret to scan. */
@Injectable()
export class StartSuperAdminTwoFactorEnrollmentUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly tokenService: SuperAdminTokenService,
    private readonly setup: SetupSuperAdminTwoFactorUseCase,
  ) {}

  async execute(challengeToken: string, meta: RequestMeta = {}): Promise<TwoFactorSetupInfo> {
    const superAdmin = await resolveChallenge(this.tokenService, this.superAdminRepo, challengeToken, '2fa-setup');
    return this.setup.execute(superAdmin.id, meta);
  }
}

/** Mandatory 2FA, step 2: confirm a code, turn 2FA on, sign in, hand out recovery codes once. */
@Injectable()
export class CompleteSuperAdminTwoFactorEnrollmentUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly tokenService: SuperAdminTokenService,
    private readonly lockout: SuperAdminLockout,
    private readonly secondFactor: SuperAdminSecondFactor,
    private readonly enable: EnableSuperAdminTwoFactorUseCase,
    private readonly sessionIssuer: SuperAdminSessionIssuer,
  ) {}

  async execute(
    challengeToken: string,
    code: string,
    meta: RequestMeta = {},
  ): Promise<SuperAdminSession & { recoveryCodes: string[] }> {
    const superAdmin = await resolveChallenge(this.tokenService, this.superAdminRepo, challengeToken, '2fa-setup');
    this.lockout.assertNotLocked(superAdmin);
    if (superAdmin.totpSecret && this.secondFactor.matchTotp(superAdmin, code) === null) {
      await this.lockout.recordFailure(superAdmin, 'bad_2fa_setup_code', meta);
      throw new BadRequestException('Invalid verification code');
    }
    const result = await this.enable.enableFor(superAdmin, code, meta);
    const session = await this.sessionIssuer.signIn(result.superAdmin, meta, { enrolled2fa: true });
    return { ...session, recoveryCodes: result.recoveryCodes };
  }
}

// ─── Passwords ───────────────────────────────────────────────────────────────

/** First sign-in with a temporary password: set a real one, then continue to 2FA. */
@Injectable()
export class CompleteSuperAdminPasswordChangeLoginUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly tokenService: SuperAdminTokenService,
    private readonly sessionIssuer: SuperAdminSessionIssuer,
    private readonly audit: PlatformAuditService,
    private readonly policy: SuperAdminAuthPolicy,
  ) {}

  async execute(challengeToken: string, newPassword: string, meta: RequestMeta = {}): Promise<SuperAdminLoginResult> {
    const superAdmin = await resolveChallenge(this.tokenService, this.superAdminRepo, challengeToken, 'password-change');
    if (await compare(newPassword, superAdmin.passwordHash)) {
      throw new BadRequestException('Choose a password different from the temporary one');
    }
    const updated = await this.superAdminRepo.setPassword(superAdmin.id, await hash(newPassword, BCRYPT_COST_REAL));
    await this.audit.record({
      action: PlatformAuditAction.SUPER_ADMIN_PASSWORD_CHANGED,
      actor: actorOf(superAdmin),
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      metadata: { reason: 'first_sign_in' },
      meta,
    });
    return afterPassword(updated, meta, this.tokenService, this.sessionIssuer, this.policy);
  }
}

/** Self-service change from the Security page. Other devices are signed out. */
@Injectable()
export class ChangeSuperAdminPasswordUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly sessionRepo: SuperAdminSessionRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(
    superAdminId: string,
    currentFamilyId: string,
    currentPassword: string,
    newPassword: string,
    meta: RequestMeta = {},
  ): Promise<{ otherSessionsSignedOut: number }> {
    const superAdmin = await this.superAdminRepo.findById(superAdminId);
    if (!superAdmin) throw new NotFoundException('Super admin not found');
    if (!(await compare(currentPassword, superAdmin.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException('Choose a new password different from the current one');
    }
    await this.superAdminRepo.setPassword(superAdminId, await hash(newPassword, BCRYPT_COST_REAL));
    const active = await this.sessionRepo.findActive(superAdminId);
    const others = [...new Set(active.map((s) => s.familyId))].filter((f) => f !== currentFamilyId);
    await Promise.all(others.map((f) => this.sessionRepo.revokeFamily(f, superAdminId)));
    await this.audit.record({
      action: PlatformAuditAction.SUPER_ADMIN_PASSWORD_CHANGED,
      actor: actorOf(superAdmin),
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      metadata: { otherSessionsSignedOut: others.length },
      meta,
    });
    return { otherSessionsSignedOut: others.length };
  }
}
