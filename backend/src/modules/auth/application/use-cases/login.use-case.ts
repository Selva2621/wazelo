import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserStatus } from '@prisma/client';
import { LoginDto } from '../dto/login.dto';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { PasswordService } from '../../domain/services/password.service';
import { TokenService, TokenPair } from '../../domain/services/token.service';
import { SessionRepository } from '../../infrastructure/repositories/session.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';

export interface LoginResult {
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
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionRepository: SessionRepository,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    const email = dto.email.toLowerCase().trim();

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Constant-time comparison defense: hash anyway to prevent timing attacks
      await this.passwordService.hash(dto.password);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (user.status === UserStatus.LOCKED) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const remainingMinutes = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / 60000,
        );

        await this.auditService.log({
          orgId: user.orgId,
          userId: user.id,
          action: 'LOGIN_FAILED',
          metadata: { reason: 'account_locked', remainingMinutes },
          ipAddress,
          userAgent,
        });

        throw new ForbiddenException(
          `Account is temporarily locked. Try again in ${remainingMinutes} minutes.`,
        );
      }

      // Lock expired — unlock the account
      await this.userRepository.resetFailedAttempts(user.id);
    }

    // Check if email is verified
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new ForbiddenException(
        'Please verify your email address before logging in. Check your inbox or request a new verification email.',
      );
    }

    // Check if suspended
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException(
        'Your account has been suspended. Contact your organization administrator.',
      );
    }

    // Verify password
    const passwordValid = await this.passwordService.verify(
      dto.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      await this.handleFailedLogin(user.id, user.orgId, ipAddress, userAgent);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Success: reset failed attempts
    await this.userRepository.resetFailedAttempts(user.id);
    await this.userRepository.updateLastLogin(user.id);

    const rememberMe = dto.rememberMe ?? false;

    // Generate token pair
    const tokenPair: TokenPair = await this.tokenService.generateTokenPair({
      sub: user.id,
      orgId: user.orgId,
      role: user.role,
      email: user.email,
    }, rememberMe);

    // Create session
    await this.sessionRepository.create({
      userId: user.id,
      orgId: user.orgId,
      refreshToken: tokenPair.refreshToken,
      expiresAt: this.tokenService.getRefreshExpiryDate(rememberMe),
      userAgent,
      ipAddress,
    });

    // Audit log
    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'User',
      targetId: user.id,
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.LOGIN_SUCCESS, {
      userId: user.id,
      orgId: user.orgId,
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

  private async handleFailedLogin(
    userId: string,
    orgId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const updatedUser = await this.userRepository.incrementFailedAttempts(userId);
    const maxAttempts = this.configService.get<number>(
      'auth.maxFailedLoginAttempts',
      5,
    );

    await this.auditService.log({
      orgId,
      userId,
      action: 'LOGIN_FAILED',
      metadata: {
        failedAttempts: updatedUser.failedLoginAttempts,
        maxAttempts,
      },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.LOGIN_FAILED, {
      userId,
      orgId,
      failedAttempts: updatedUser.failedLoginAttempts,
    });

    if (updatedUser.failedLoginAttempts >= maxAttempts) {
      const lockDurationMinutes = this.configService.get<number>(
        'auth.accountLockDurationMinutes',
        30,
      );
      const lockedUntil = new Date(
        Date.now() + lockDurationMinutes * 60 * 1000,
      );

      await this.userRepository.lockAccount(userId, lockedUntil);

      await this.auditService.log({
        orgId,
        userId,
        action: 'ACCOUNT_LOCKED',
        metadata: { lockedUntil: lockedUntil.toISOString(), lockDurationMinutes },
        ipAddress,
        userAgent,
      });

      this.eventEmitter.emit(EVENT_NAMES.ACCOUNT_LOCKED, {
        userId,
        orgId,
        lockedUntil,
      });

      this.logger.warn(
        `Account locked for user ${userId} until ${lockedUntil.toISOString()}`,
      );
    }
  }
}
