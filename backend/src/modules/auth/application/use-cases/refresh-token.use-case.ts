import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { SessionRepository } from '../../infrastructure/repositories/session.repository';
import { TokenService, TokenPair } from '../../domain/services/token.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { UserStatus } from '@prisma/client';

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    orgId: string;
  };
}

@Injectable()
export class RefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefreshTokenResult> {
    // Find active session with this refresh token
    const session =
      await this.sessionRepository.findByRefreshToken(refreshToken);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Verify the JWT signature of the refresh token
    let payload: { sub: string; orgId: string };
    try {
      payload = await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      // Token tampered or expired — revoke the session
      await this.sessionRepository.revokeSession(session.id);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check user is still active
    const user = await this.userRepository.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.sessionRepository.revokeSession(session.id);
      throw new UnauthorizedException('Account is not active');
    }

    // Revoke old session (token rotation — each refresh token is single-use)
    await this.sessionRepository.revokeSession(session.id);

    // Generate new token pair
    const tokenPair: TokenPair = await this.tokenService.generateTokenPair({
      sub: user.id,
      orgId: user.orgId,
      role: user.role,
      email: user.email,
    });

    // Create new session
    await this.sessionRepository.create({
      userId: user.id,
      orgId: user.orgId,
      refreshToken: tokenPair.refreshToken,
      expiresAt: this.tokenService.getRefreshExpiryDate(),
      userAgent,
      ipAddress,
    });

    // Audit log
    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'TOKEN_REFRESHED',
      targetType: 'Session',
      targetId: session.id,
      ipAddress,
      userAgent,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        orgId: user.orgId,
      },
    };
  }
}
