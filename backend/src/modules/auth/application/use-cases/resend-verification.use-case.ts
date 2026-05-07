import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenType, UserStatus } from '@prisma/client';
import { TokenRepository } from '../../infrastructure/repositories/token.repository';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { TokenService } from '../../domain/services/token.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES, SAFE_AUTH_MESSAGE } from '@/common/constants';

export interface ResendVerificationResult {
  message: string;
}

@Injectable()
export class ResendVerificationUseCase {
  private readonly logger = new Logger(ResendVerificationUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ResendVerificationResult> {
    const normalizedEmail = email.toLowerCase().trim();

    // Look up user — return safe message regardless to prevent enumeration
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) {
      return { message: SAFE_AUTH_MESSAGE };
    }

    // Enforce cooldown: check most recent token creation time
    const cooldownSeconds = this.configService.get<number>(
      'auth.verificationResendCooldownSeconds',
      60,
    );
    const mostRecent = await this.tokenRepository.findMostRecentToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
    );
    if (mostRecent) {
      const elapsed = Date.now() - mostRecent.createdAt.getTime();
      if (elapsed < cooldownSeconds * 1000) {
        const remainingSeconds = Math.ceil(
          (cooldownSeconds * 1000 - elapsed) / 1000,
        );
        throw new HttpException(
          `Please wait ${remainingSeconds} seconds before requesting another verification email.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Enforce max resends per hour
    const maxResendsPerHour = this.configService.get<number>(
      'auth.verificationMaxResendsPerHour',
      5,
    );
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const recentCount = await this.tokenRepository.countRecentTokens(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      oneHourAgo,
    );
    if (recentCount >= maxResendsPerHour) {
      throw new HttpException(
        'Maximum verification email limit reached. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Invalidate old tokens
    await this.tokenRepository.invalidateAllForUser(
      user.id,
      TokenType.EMAIL_VERIFICATION,
    );

    // Generate new token
    const token = this.tokenService.generateSecureToken();
    const expiryHours = this.configService.get<number>(
      'auth.verificationTokenExpiryHours',
      24,
    );
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const verificationToken = await this.tokenRepository.create({
      userId: user.id,
      token,
      type: TokenType.EMAIL_VERIFICATION,
      expiresAt,
    });

    // Queue email
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    await this.queueService.publish(QUEUE_NAMES.SEND_EMAIL, {
      type: 'verification',
      to: normalizedEmail,
      firstName: user.firstName,
      token,
      verificationUrl: `${frontendUrl}/auth/verify-email?token=${token}`,
    });

    // Audit log
    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'EMAIL_VERIFICATION_SENT',
      targetType: 'VerificationToken',
      targetId: verificationToken.id,
      metadata: { resend: true },
      ipAddress,
      userAgent,
    });

    return { message: SAFE_AUTH_MESSAGE };
  }
}
