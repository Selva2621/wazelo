import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { compare } from 'bcrypt';
import * as QRCode from 'qrcode';
import { PlatformAuditAction, SuperAdmin } from '@prisma/client';
import { EncryptionService } from '@/common/services/encryption.service';
import { PlatformAuditService, RequestMeta } from '../services/platform-audit.service';
import { SuperAdminRepository } from '../../infrastructure/repositories/super-admin.repository';
import { SuperAdminTokenService } from '../../domain/services/super-admin-token.service';
import { TotpService } from '../../domain/services/totp.service';
import { SuperAdminLoginDto } from '../dto/super-admin-auth.dto';

export interface SuperAdminProfile {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
}

export interface SuperAdminSession {
  accessToken: string;
  expiresIn: number;
  /** Set as an HttpOnly cookie by the controller — never returned in the body */
  refreshToken: string;
  superAdmin: SuperAdminProfile;
}

export type SuperAdminLoginResult =
  | ({ requiresTwoFactor: false } & SuperAdminSession)
  | { requiresTwoFactor: true; challengeToken: string };

function toProfile(superAdmin: SuperAdmin): SuperAdminProfile {
  return {
    id: superAdmin.id,
    name: superAdmin.name,
    email: superAdmin.email,
    twoFactorEnabled: superAdmin.totpEnabled,
    lastLoginAt: superAdmin.lastLoginAt,
  };
}

/**
 * Issues access + refresh tokens. With `loginMeta` it is a new sign-in:
 * stamps lastLoginAt and writes the audit entry. Refreshes pass no meta.
 */
@Injectable()
export class SuperAdminSessionIssuer {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly tokenService: SuperAdminTokenService,
    private readonly audit: PlatformAuditService,
  ) {}

  async issue(superAdmin: SuperAdmin, loginMeta?: RequestMeta): Promise<SuperAdminSession> {
    const [{ accessToken, expiresIn }, refreshToken] = await Promise.all([
      this.tokenService.generateAccessToken(superAdmin),
      this.tokenService.generateRefreshToken(superAdmin),
    ]);
    if (loginMeta) {
      await this.superAdminRepo.recordLogin(superAdmin.id);
      await this.audit.record({
        action: PlatformAuditAction.SUPER_ADMIN_LOGIN,
        actor: { id: superAdmin.id, email: superAdmin.email },
        targetType: 'SuperAdmin',
        targetId: superAdmin.id,
        metadata: { twoFactor: superAdmin.totpEnabled },
        meta: loginMeta,
      });
    }
    return { accessToken, expiresIn, refreshToken, superAdmin: toProfile(superAdmin) };
  }
}

/** Decrypts the stored TOTP secret and checks a code against it. */
@Injectable()
export class SuperAdminTotpVerifier {
  constructor(
    private readonly totpService: TotpService,
    private readonly encryption: EncryptionService,
  ) {}

  verify(superAdmin: SuperAdmin, code: string): boolean {
    if (!superAdmin.totpSecret) return false;
    return this.totpService.verify(this.encryption.decrypt(superAdmin.totpSecret), code);
  }
}

@Injectable()
export class SuperAdminLoginUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly tokenService: SuperAdminTokenService,
    private readonly sessionIssuer: SuperAdminSessionIssuer,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(dto: SuperAdminLoginDto, meta: RequestMeta = {}): Promise<SuperAdminLoginResult> {
    const superAdmin = await this.superAdminRepo.findByEmail(dto.email);
    if (!superAdmin) {
      // Constant-time defense: hash anyway to prevent timing attacks
      await compare(dto.password, '$2b$12$invalidhashplaceholderfortiming000000000000000000000000');
      await this.recordFailure(dto.email, 'unknown_account', meta);
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await compare(dto.password, superAdmin.passwordHash);
    if (!passwordValid) {
      await this.recordFailure(dto.email, 'bad_password', meta, superAdmin);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (superAdmin.totpEnabled) {
      // The login is only recorded once the 2FA step succeeds
      const challengeToken = await this.tokenService.generateChallengeToken(superAdmin);
      return { requiresTwoFactor: true, challengeToken };
    }

    return { requiresTwoFactor: false, ...(await this.sessionIssuer.issue(superAdmin, meta)) };
  }

  private recordFailure(email: string, reason: string, meta: RequestMeta, superAdmin?: SuperAdmin) {
    return this.audit.record({
      action: PlatformAuditAction.SUPER_ADMIN_LOGIN_FAILED,
      actor: superAdmin ? { id: superAdmin.id, email: superAdmin.email } : null,
      targetType: 'SuperAdmin',
      targetId: superAdmin?.id,
      metadata: { email: email.toLowerCase(), reason },
      meta,
    });
  }
}

@Injectable()
export class CompleteSuperAdminTwoFactorLoginUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly tokenService: SuperAdminTokenService,
    private readonly totpVerifier: SuperAdminTotpVerifier,
    private readonly sessionIssuer: SuperAdminSessionIssuer,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(challengeToken: string, code: string, meta: RequestMeta = {}): Promise<SuperAdminSession> {
    const payload = await this.tokenService.verify(challengeToken, '2fa');
    const superAdmin = await this.superAdminRepo.findById(payload.sub);
    if (!superAdmin || superAdmin.tokenVersion !== payload.tv || !superAdmin.totpEnabled) {
      throw new UnauthorizedException('Login session expired — sign in again');
    }
    if (!this.totpVerifier.verify(superAdmin, code)) {
      await this.audit.record({
        action: PlatformAuditAction.SUPER_ADMIN_LOGIN_FAILED,
        actor: { id: superAdmin.id, email: superAdmin.email },
        targetType: 'SuperAdmin',
        targetId: superAdmin.id,
        metadata: { email: superAdmin.email, reason: 'bad_2fa_code' },
        meta,
      });
      throw new UnauthorizedException('Invalid verification code');
    }
    return this.sessionIssuer.issue(superAdmin, meta);
  }
}

@Injectable()
export class RefreshSuperAdminSessionUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly tokenService: SuperAdminTokenService,
    private readonly sessionIssuer: SuperAdminSessionIssuer,
  ) {}

  async execute(refreshToken: string): Promise<SuperAdminSession> {
    const payload = await this.tokenService.verify(refreshToken, 'refresh');
    const superAdmin = await this.superAdminRepo.findById(payload.sub);
    if (!superAdmin || superAdmin.tokenVersion !== payload.tv) {
      throw new UnauthorizedException('Session revoked');
    }
    // Rotates the refresh token; a refresh is not a new login
    return this.sessionIssuer.issue(superAdmin);
  }
}

@Injectable()
export class LogoutSuperAdminUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  /** Revokes every access and refresh token for this account (all devices). */
  async execute(superAdminId: string, meta: RequestMeta = {}): Promise<void> {
    const superAdmin = await this.superAdminRepo.incrementTokenVersion(superAdminId);
    await this.audit.record({
      action: PlatformAuditAction.SUPER_ADMIN_LOGOUT,
      actor: { id: superAdmin.id, email: superAdmin.email },
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      meta,
    });
  }
}

@Injectable()
export class GetSuperAdminProfileUseCase {
  constructor(private readonly superAdminRepo: SuperAdminRepository) {}

  async execute(superAdminId: string): Promise<SuperAdminProfile> {
    const superAdmin = await this.superAdminRepo.findById(superAdminId);
    if (!superAdmin) throw new NotFoundException('Super admin not found');
    return toProfile(superAdmin);
  }
}

@Injectable()
export class SetupSuperAdminTwoFactorUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly totpService: TotpService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Generates a new secret and stores it (encrypted, not yet enabled).
   * 2FA only turns on once EnableSuperAdminTwoFactorUseCase confirms a code.
   */
  async execute(superAdminId: string) {
    const superAdmin = await this.superAdminRepo.findById(superAdminId);
    if (!superAdmin) throw new NotFoundException('Super admin not found');
    if (superAdmin.totpEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = this.totpService.generateSecret();
    await this.superAdminRepo.setTotp(superAdminId, this.encryption.encrypt(secret), false);

    const otpAuthUrl = this.totpService.buildOtpAuthUrl(secret, superAdmin.email);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    return { secret, otpAuthUrl, qrCodeDataUrl };
  }
}

@Injectable()
export class EnableSuperAdminTwoFactorUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly totpVerifier: SuperAdminTotpVerifier,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(superAdminId: string, code: string, meta: RequestMeta = {}): Promise<SuperAdminProfile> {
    const superAdmin = await this.superAdminRepo.findById(superAdminId);
    if (!superAdmin) throw new NotFoundException('Super admin not found');
    if (superAdmin.totpEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }
    if (!superAdmin.totpSecret) {
      throw new BadRequestException('Start two-factor setup first');
    }
    if (!this.totpVerifier.verify(superAdmin, code)) {
      throw new BadRequestException('Invalid verification code');
    }
    const updated = await this.superAdminRepo.setTotp(superAdminId, superAdmin.totpSecret, true);
    await this.audit.record({
      action: PlatformAuditAction.TWO_FACTOR_ENABLED,
      actor: { id: superAdmin.id, email: superAdmin.email },
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      meta,
    });
    return toProfile(updated);
  }
}

@Injectable()
export class DisableSuperAdminTwoFactorUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly totpVerifier: SuperAdminTotpVerifier,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(superAdminId: string, code: string, meta: RequestMeta = {}): Promise<SuperAdminProfile> {
    const superAdmin = await this.superAdminRepo.findById(superAdminId);
    if (!superAdmin) throw new NotFoundException('Super admin not found');
    if (!superAdmin.totpEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }
    if (!this.totpVerifier.verify(superAdmin, code)) {
      throw new BadRequestException('Invalid verification code');
    }
    const updated = await this.superAdminRepo.setTotp(superAdminId, null, false);
    await this.audit.record({
      action: PlatformAuditAction.TWO_FACTOR_DISABLED,
      actor: { id: superAdmin.id, email: superAdmin.email },
      targetType: 'SuperAdmin',
      targetId: superAdmin.id,
      meta,
    });
    return toProfile(updated);
  }
}
