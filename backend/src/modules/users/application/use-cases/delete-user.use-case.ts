import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole } from '@prisma/client';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EVENT_NAMES } from '@/common/constants';

@Injectable()
export class DeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    targetUserId: string,
    orgId: string,
    deletedById: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findByIdAndOrg(
      targetUserId,
      orgId,
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cannot delete yourself
    if (targetUserId === deletedById) {
      throw new BadRequestException('You cannot delete your own account');
    }

    // Cannot delete last admin
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.userRepository.countAdminsInOrg(orgId);
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot delete the last admin account',
        );
      }
    }

    // Soft delete + revoke sessions in transaction
    await this.prisma.$transaction(async (tx) => {
      // Soft delete (data retained per AC2)
      await tx.user.update({
        where: { id: targetUserId },
        data: { deletedAt: new Date() },
      });

      // Revoke all sessions
      await tx.session.updateMany({
        where: {
          userId: targetUserId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    });

    // Audit log (AC3: Audit logs maintained)
    await this.auditService.log({
      orgId,
      userId: deletedById,
      action: 'USER_DELETED',
      targetType: 'User',
      targetId: targetUserId,
      metadata: {
        email: user.email,
        role: user.role,
        deletedById,
      },
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.USER_DELETED, {
      orgId,
      userId: targetUserId,
      deletedById,
    });

    this.logger.log(
      `User ${deletedById} soft-deleted user ${targetUserId} (${user.email}) in org ${orgId}`,
    );

    return { message: 'User deleted successfully' };
  }
}
