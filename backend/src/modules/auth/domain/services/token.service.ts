import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { JwtPayload } from '@/common/decorators';
import type { StringValue } from 'ms';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiry: StringValue;
  private readonly refreshExpiry: StringValue;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessSecret = this.configService.getOrThrow<string>('jwt.accessSecret');
    this.refreshSecret = this.configService.getOrThrow<string>('jwt.refreshSecret');
    this.accessExpiry = this.configService.get<StringValue>('jwt.accessExpiry', '15m');
    this.refreshExpiry = this.configService.get<StringValue>('jwt.refreshExpiry', '7d');
  }

  async generateTokenPair(payload: JwtPayload, rememberMe = false): Promise<TokenPair> {
    const refreshExpiry: StringValue = rememberMe ? '30d' : '1d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: payload.sub, orgId: payload.orgId, role: payload.role, email: payload.email },
        { secret: this.accessSecret, expiresIn: this.accessExpiry },
      ),
      this.jwtService.signAsync(
        { sub: payload.sub, orgId: payload.orgId, type: 'refresh' },
        { secret: this.refreshSecret, expiresIn: refreshExpiry },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiryToSeconds(this.accessExpiry),
    };
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.accessSecret,
    });
  }

  async verifySuperAdminToken(token: string): Promise<JwtPayload> {
    const superAdminSecret = this.configService.getOrThrow<string>('jwt.superAdminSecret');
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: superAdminSecret,
    });
  }

  async verifyRefreshToken(
    token: string,
  ): Promise<{ sub: string; orgId: string }> {
    return this.jwtService.verifyAsync(token, {
      secret: this.refreshSecret,
    });
  }

  generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 min

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  getRefreshExpiryDate(rememberMe = false): Date {
    const expiry = rememberMe ? '30d' : '1d';
    return new Date(Date.now() + this.parseExpiryToSeconds(expiry) * 1000);
  }
}
