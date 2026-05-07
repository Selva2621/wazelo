import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserStatus, UserRole } from '@prisma/client';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EVENT_NAMES } from '@/common/constants';
import { User } from '@prisma/client';

@Injectable()
export class DisableUserUseCase {
  private readonly logger = new Logger(DisableUserUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    targetUserId: string,
    orgId: string,
    disabledById: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findByIdAndOrg(
      targetUserId,
      orgId,
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cannot disable yourself
    if (targetUserId === disabledById) {
      throw new BadRequestException('You cannot disable your own account');
    }

    // If disabling an admin, ensure at least 1 admin remains
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.userRepository.countAdminsInOrg(orgId);
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot disable the last admin account',
        );
      }
    }

    // Already suspended — idempotent
    if (user.status === UserStatus.SUSPENDED) {
      const { passwordHash, ...sanitized } = user;
      return sanitized;
    }

    // Disable user + revoke all active sessions in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: { status: UserStatus.SUSPENDED },
      });

      // Revoke all active sessions — immediate access revocation
      await tx.session.updateMany({
        where: {
          userId: targetUserId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      return updatedUser;
    });

    // Audit log
    await this.auditService.log({
      orgId,
      userId: disabledById,
      action: 'USER_DISABLED',
      targetType: 'User',
      targetId: targetUserId,
      metadata: {
        previousStatus: user.status,
        email: user.email,
      },
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.USER_DISABLED, {
      orgId,
      userId: targetUserId,
      disabledById,
    });

    this.logger.log(
      `User ${disabledById} disabled user ${targetUserId} in org ${orgId}`,
    );

    const { passwordHash, ...sanitized } = updated;
    return sanitized;
  }
}
