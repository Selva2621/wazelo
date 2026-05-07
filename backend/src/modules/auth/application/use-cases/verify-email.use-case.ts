import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TokenType } from '@prisma/client';
import { TokenRepository } from '../../infrastructure/repositories/token.repository';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface VerifyEmailResult {
  message: string;
}

@Injectable()
export class VerifyEmailUseCase {
  private readonly logger = new Logger(VerifyEmailUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenRepository: TokenRepository,
    private readonly userRepository: UserRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<VerifyEmailResult> {
    // Find valid token
    const verificationToken = await this.tokenRepository.findValidToken(
      token,
      TokenType.EMAIL_VERIFICATION,
    );

    if (!verificationToken) {
      throw new BadRequestException(
        'Verification link is invalid or has expired. Please request a new one.',
      );
    }

    // Atomically mark token as used and activate user
    await this.prisma.$transaction(async (tx) => {
      // Double-check token hasn't been used (race condition guard)
      const freshToken = await tx.verificationToken.findFirst({
        where: {
          id: verificationToken.id,
          usedAt: null,
        },
      });

      if (!freshToken) {
        throw new BadRequestException('This verification link has already been used.');
      }

      // Mark token as used
      await tx.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      });

      // Activate user
      await tx.user.update({
        where: { id: verificationToken.userId },
        data: {
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    const user = await this.userRepository.findById(verificationToken.userId);

    // Audit log
    await this.auditService.log({
      orgId: user?.orgId,
      userId: user?.id,
      action: 'EMAIL_VERIFIED',
      targetType: 'User',
      targetId: user?.id,
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.EMAIL_VERIFIED, {
      userId: verificationToken.userId,
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }
}
