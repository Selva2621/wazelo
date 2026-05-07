import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TokenType, UserStatus } from '@prisma/client';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { TokenRepository } from '../../infrastructure/repositories/token.repository';
import { TokenService } from '../../domain/services/token.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES, SAFE_AUTH_MESSAGE, EVENT_NAMES } from '@/common/constants';

export interface ForgotPasswordResult {
  message: string;
}

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ForgotPasswordResult> {
    const normalizedEmail = email.toLowerCase().trim();

    // Always return safe message to prevent email enumeration
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user || user.status === UserStatus.PENDING_VERIFICATION) {
      // Don't reveal whether user exists
      return { message: SAFE_AUTH_MESSAGE };
    }

    // Invalidate all existing password reset tokens
    await this.tokenRepository.invalidateAllForUser(
      user.id,
      TokenType.PASSWORD_RESET,
    );

    // Generate reset token
    const token = this.tokenService.generateSecureToken();
    const expiryMinutes = this.configService.get<number>(
      'auth.passwordResetTokenExpiryMinutes',
      15,
    );
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await this.tokenRepository.create({
      userId: user.id,
      token,
      type: TokenType.PASSWORD_RESET,
      expiresAt,
    });

    // Queue reset email
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    await this.queueService.publish(QUEUE_NAMES.SEND_EMAIL, {
      type: 'password_reset',
      to: normalizedEmail,
      firstName: user.firstName,
      token,
      resetUrl: `${frontendUrl}/auth/reset-password?token=${token}`,
    });

    // Audit log
    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      targetType: 'User',
      targetId: user.id,
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.PASSWORD_RESET_REQUESTED, {
      userId: user.id,
      orgId: user.orgId,
    });

    return { message: SAFE_AUTH_MESSAGE };
  }
}
