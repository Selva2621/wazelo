import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SuperAdmin } from '@prisma/client';
import type { StringValue } from 'ms';

/** Audience claim on every super admin token — tenant tokens never carry it. */
export const SUPER_ADMIN_AUDIENCE = 'wazelo-platform';

/**
 * '2fa' = enter a code; '2fa-setup' = 2FA is mandatory and the account must enrol first;
 * 'password-change' = signed in with a temporary password that must be replaced first.
 */
export type SuperAdminTokenType = 'access' | 'refresh' | '2fa' | '2fa-setup' | 'password-change';

export interface SuperAdminTokenPayload {
  sub: string;
  email: string;
  /** SuperAdmin.tokenVersion at issue time — a mismatch means the session was revoked */
  tv: number;
  typ: SuperAdminTokenType;
  isSuperAdmin: true;
  /** SuperAdminSession.familyId — on access and refresh tokens; one per sign-in */
  fid?: string;
  /** SuperAdminSession.id — refresh tokens only, so every refresh token is unique */
  jti?: string;
}

const REFRESH_EXPIRY: StringValue = '1d';
export const REFRESH_EXPIRY_MS = 24 * 60 * 60 * 1000;
const CHALLENGE_EXPIRY: StringValue = '5m';
const SETUP_CHALLENGE_EXPIRY: StringValue = '10m';
const ACCESS_EXPIRY: StringValue = '15m';

@Injectable()
export class SuperAdminTokenService {
  private readonly secret: string;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.secret = configService.getOrThrow<string>('jwt.superAdminSecret');
  }

  /** Fixed 15 minutes — not tied to the tenant JWT_ACCESS_EXPIRY setting. */
  async generateAccessToken(
    superAdmin: SuperAdmin,
    familyId: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const accessToken = await this.sign(superAdmin, 'access', ACCESS_EXPIRY, { fid: familyId });
    const decoded = this.jwtService.decode(accessToken) as { exp: number; iat: number };
    return { accessToken, expiresIn: decoded.exp - decoded.iat };
  }

  generateRefreshToken(superAdmin: SuperAdmin, familyId: string, sessionId: string): Promise<string> {
    return this.sign(superAdmin, 'refresh', REFRESH_EXPIRY, { fid: familyId, jti: sessionId });
  }

  /** Short-lived token proving the password step passed; exchanged for a session after 2FA. */
  generateChallengeToken(superAdmin: SuperAdmin, typ: '2fa' | '2fa-setup' | 'password-change' = '2fa'): Promise<string> {
    return this.sign(superAdmin, typ, typ === '2fa' ? CHALLENGE_EXPIRY : SETUP_CHALLENGE_EXPIRY);
  }

  /**
   * Verify signature, audience and token type. Does NOT check tokenVersion —
   * callers compare `tv` against the stored SuperAdmin row.
   */
  async verify(token: string, expectedType: SuperAdminTokenType): Promise<SuperAdminTokenPayload> {
    let payload: SuperAdminTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<SuperAdminTokenPayload>(token, {
        secret: this.secret,
        audience: SUPER_ADMIN_AUDIENCE,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired super admin token');
    }
    if (payload.typ !== expectedType || payload.isSuperAdmin !== true) {
      throw new UnauthorizedException('Invalid super admin token');
    }
    if ((expectedType === 'access' || expectedType === 'refresh') && !payload.fid) {
      // Issued before sessions were tracked — force a fresh sign-in
      throw new UnauthorizedException('Session expired — sign in again');
    }
    return payload;
  }

  private sign(
    superAdmin: SuperAdmin,
    typ: SuperAdminTokenType,
    expiresIn: StringValue,
    extra: { fid?: string; jti?: string } = {},
  ): Promise<string> {
    const { jti, ...claims } = extra;
    return this.jwtService.signAsync(
      {
        sub: superAdmin.id,
        email: superAdmin.email,
        tv: superAdmin.tokenVersion,
        typ,
        isSuperAdmin: true,
        ...claims,
      },
      { secret: this.secret, expiresIn, audience: SUPER_ADMIN_AUDIENCE, ...(jti ? { jwtid: jti } : {}) },
    );
  }
}
