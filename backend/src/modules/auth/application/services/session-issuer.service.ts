import { Injectable } from '@nestjs/common';
import { TokenService, TokenPair } from '../../domain/services/token.service';
import { SessionRepository } from '../../infrastructure/repositories/session.repository';

export interface SessionUser {
  id: string;
  orgId: string;
  role: string;
  email: string;
}

/**
 * Starts a tenant session: access + refresh token pair and its DB session row (a new
 * refresh family). Shared by password login and "Continue with Google" so both issue
 * exactly the same session.
 */
@Injectable()
export class SessionIssuer {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async issue(
    user: SessionUser,
    opts: { rememberMe: boolean; ipAddress?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const tokenPair = await this.tokenService.generateTokenPair(
      { sub: user.id, orgId: user.orgId, role: user.role, email: user.email },
      opts.rememberMe,
    );

    await this.sessionRepository.create({
      userId: user.id,
      orgId: user.orgId,
      refreshToken: tokenPair.refreshToken,
      expiresAt: this.tokenService.getRefreshExpiryDate(opts.rememberMe),
      rememberMe: opts.rememberMe,
      userAgent: opts.userAgent,
      ipAddress: opts.ipAddress,
    });

    return tokenPair;
  }
}
