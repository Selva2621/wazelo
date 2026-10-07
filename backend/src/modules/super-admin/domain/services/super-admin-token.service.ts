import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SuperAdmin } from '@prisma/client';
import type { StringValue } from 'ms';

/** Audience claim on every super admin token — tenant tokens never carry it. */
export const SUPER_ADMIN_AUDIENCE = 'wazelo-platform';

export type SuperAdminTokenType = 'access' | 'refresh' | '2fa';

export interface SuperAdminTokenPayload {
  sub: string;
  email: string;
  /** SuperAdmin.tokenVersion at issue time — a mismatch means the session was revoked */
  tv: number;
  typ: SuperAdminTokenType;
  isSuperAdmin: true;
}

const REFRESH_EXPIRY: StringValue = '1d';
const CHALLENGE_EXPIRY: StringValue = '5m';

@Injectable()
export class SuperAdminTokenService {
  private readonly secret: string;
  private readonly accessExpiry: StringValue;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.secret = this.configService.getOrThrow<string>('jwt.superAdminSecret');
    this.accessExpiry = this.configService.get<StringValue>('jwt.accessExpiry', '15m');
  }

  async generateAccessToken(superAdmin: SuperAdmin): Promise<{ accessToken: string; expiresIn: number }> {
    const accessToken = await this.sign(superAdmin, 'access', this.accessExpiry);
    const decoded = this.jwtService.decode(accessToken) as { exp: number; iat: number };
    return { accessToken, expiresIn: decoded.exp - decoded.iat };
  }

  generateRefreshToken(superAdmin: SuperAdmin): Promise<string> {
    return this.sign(superAdmin, 'refresh', REFRESH_EXPIRY);
  }

  /** Short-lived token proving the password step passed; exchanged for a session after the 2FA code. */
  generateChallengeToken(superAdmin: SuperAdmin): Promise<string> {
    return this.sign(superAdmin, '2fa', CHALLENGE_EXPIRY);
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
    return payload;
  }

  private sign(superAdmin: SuperAdmin, typ: SuperAdminTokenType, expiresIn: StringValue): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: superAdmin.id,
        email: superAdmin.email,
        tv: superAdmin.tokenVersion,
        typ,
        isSuperAdmin: true,
      },
      { secret: this.secret, expiresIn, audience: SUPER_ADMIN_AUDIENCE },
    );
  }
}
