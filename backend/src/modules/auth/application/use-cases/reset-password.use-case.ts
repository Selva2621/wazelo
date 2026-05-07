import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TokenType } from '@prisma/client';
import { TokenRepository } from '../../infrastructure/repositories/token.repository';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { SessionRepository } from '../../infrastructure/repositories/session.repository';
import { PasswordService } from '../../domain/services/password.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface ResetPasswordResult {
  message: string;
}

@Injectable()
export class ResetPasswordUseCase {
  private readonly logger = new Logger(ResetPasswordUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenRepository: TokenRepository,
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    token: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ResetPasswordResult> {
    // Find valid token
    const resetToken = await this.tokenRepository.findValidToken(
      token,
      TokenType.PASSWORD_RESET,
    );

    if (!resetToken) {
      throw new BadRequestException(
        'Password reset link is invalid or has expired. Please request a new one.',
      );
    }

    // Hash new password before transaction
    const passwordHash = await this.passwordService.hash(newPassword);

    // Atomically: mark token used, update password, revoke sessions
    await this.prisma.$transaction(async (tx) => {
      // Double-check token hasn't been used (race condition guard)
      const freshToken = await tx.verificationToken.findFirst({
        where: {
          id: resetToken.id,
          usedAt: null,
        },
      });

      if (!freshToken) {
        throw new BadRequestException(
          'This password reset link has already been used.',
        );
      }

      // Mark token as used
      await tx.verificationToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      // Update password
      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: 'ACTIVE',
        },
      });

      // Revoke all sessions (force re-login everywhere)
      await tx.session.updateMany({
        where: {
          userId: resetToken.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    });

    // Invalidate all remaining password reset tokens for this user
    await this.tokenRepository.invalidateAllForUser(
      resetToken.userId,
      TokenType.PASSWORD_RESET,
    );

    const user = await this.userRepository.findById(resetToken.userId);

    // Audit log
    await this.auditService.log({
      orgId: user?.orgId,
      userId: user?.id,
      action: 'PASSWORD_RESET_COMPLETED',
      targetType: 'User',
      targetId: user?.id,
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.PASSWORD_RESET_COMPLETED, {
      userId: resetToken.userId,
    });

    return {
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }
}
