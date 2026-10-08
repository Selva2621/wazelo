import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Prisma, Session, User } from '@prisma/client';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { OrgRepository } from '@/modules/org/infrastructure/repositories/org.repository';
import { SessionRepository } from '../../infrastructure/repositories/session.repository';
import { TokenService, TokenPair } from '../../domain/services/token.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { UserStatus } from '@prisma/client';
import { OrgStatusService } from '@/modules/org/domain/services/org-status.service';
import { orgSuspendedException } from '@/modules/org/interfaces/guards/org-status.guard';

/**
 * How long a just-rotated refresh token is still honoured. Covers two tabs (or a tab and
 * the proactive timer) refreshing at the same moment with the same cookie: the loser gets an
 * access token instead of being logged out. Beyond this window, a rotated token coming back
 * means it was copied, so the whole family is revoked.
 */
const ROTATION_GRACE_MS = 30_000;

export interface RefreshTokenResult {
  accessToken: string;
  /** Absent on the grace path: the browser already holds the newer cookie, keep it. */
  refreshToken?: string;
  expiresIn: number;
  rememberMe: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    orgId: string;
    orgType?: string;
  };
}

@Injectable()
export class RefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly orgRepository: OrgRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
    private readonly orgStatus: OrgStatusService,
  ) {}

  async execute(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefreshTokenResult> {
    // Look up regardless of state: a revoked/rotated hit is how races and reuse are told apart
    const session = await this.sessionRepository.findByRefreshTokenAnyState(refreshToken);

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Verify the JWT signature of the refresh token
    let payload: { sub: string; orgId: string };
    try {
      payload = await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      // Token tampered or expired — revoke the session
      if (!session.revokedAt) await this.sessionRepository.revokeSession(session.id);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const familyId = session.familyId ?? session.id;

    if (session.revokedAt) {
      // Logged out or revoked by an admin: just refuse
      if (!session.rotatedAt) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      // Concurrent refresh lost the race moments ago: hand back an access token only
      if (Date.now() - session.rotatedAt.getTime() <= ROTATION_GRACE_MS) {
        if (!(await this.sessionRepository.familyHasActiveSession(familyId))) {
          throw new UnauthorizedException('Invalid or expired refresh token');
        }
        const user = await this.requireActiveUser(payload.sub);
        return this.graceResult(user, session);
      }
      // A rotated token replayed later was copied: kill every session from that login
      await this.handleReuse(session, familyId, ipAddress, userAgent);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.sessionRepository.revokeSession(session.id);
      throw new UnauthorizedException('Account is not active');
    }
    if (await this.orgStatus.isSuspended(user.orgId)) {
      await this.sessionRepository.revokeSession(session.id);
      throw orgSuspendedException();
    }

    // Preserve rememberMe from the original session
    const rememberMe = session.rememberMe ?? false;

    // Independent steps run together: this endpoint gates every page reload (the app shows
    // a skeleton until it answers).
    const [org, claimed, tokenPair] = await Promise.all([
      // orgType goes back in the response
      this.orgRepository.findById(user.orgId),
      // Atomic single-use claim: only one concurrent request may rotate this token
      this.sessionRepository.claimForRotation(session.id),
      // New pair keeps the rememberMe expiry
      this.tokenService.generateTokenPair({
        sub: user.id,
        orgId: user.orgId,
        role: user.role,
        email: user.email,
      }, rememberMe) as Promise<TokenPair>,
    ]);

    // Another request rotated it between our read and our claim: same as the grace path
    if (!claimed) {
      return {
        accessToken: tokenPair.accessToken,
        expiresIn: tokenPair.expiresIn,
        rememberMe,
        user: this.toUserDto(user, org?.orgType),
      };
    }

    // Create the successor session in the same family
    try {
      await this.sessionRepository.create({
        userId: user.id,
        orgId: user.orgId,
        refreshToken: tokenPair.refreshToken,
        familyId,
        expiresAt: this.tokenService.getRefreshExpiryDate(rememberMe),
        rememberMe,
        userAgent,
        ipAddress,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Identical token minted twice (jti makes this practically impossible) — treat as invalid
        throw new UnauthorizedException('Token conflict, please retry');
      }
      throw err;
    }

    // Audit log — not awaited: it is buffered and never throws, and a buffer flush
    // shouldn't hold up the response.
    void this.auditService.log({
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
      rememberMe,
      user: this.toUserDto(user, org?.orgType),
    };
  }

  private async requireActiveUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }
    if (await this.orgStatus.isSuspended(user.orgId)) {
      throw orgSuspendedException();
    }
    return user;
  }

  private async graceResult(user: User, session: Session): Promise<RefreshTokenResult> {
    const [org, access] = await Promise.all([
      this.orgRepository.findById(user.orgId),
      this.tokenService.generateAccessToken({
        sub: user.id,
        orgId: user.orgId,
        role: user.role,
        email: user.email,
      }),
    ]);
    return {
      ...access,
      rememberMe: session.rememberMe ?? false,
      user: this.toUserDto(user, org?.orgType),
    };
  }

  private async handleReuse(
    session: Session,
    familyId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const revoked = await this.sessionRepository.revokeFamily(familyId);
    this.logger.warn('Refresh token reuse detected; session family revoked', {
      userId: session.userId,
      familyId,
      revoked,
      ip: ipAddress,
    });
    void this.auditService.log({
      orgId: session.orgId,
      userId: session.userId,
      action: 'REFRESH_TOKEN_REUSED',
      targetType: 'Session',
      targetId: session.id,
      metadata: { familyId, sessionsRevoked: revoked },
      ipAddress,
      userAgent,
    });
  }

  private toUserDto(user: User, orgType?: string): RefreshTokenResult['user'] {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      orgId: user.orgId,
      orgType,
    };
  }
}
