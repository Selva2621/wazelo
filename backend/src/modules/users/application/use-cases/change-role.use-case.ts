import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole } from '@prisma/client';
import { ChangeRoleDto } from '../dto/change-role.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';
import { User } from '@prisma/client';

@Injectable()
export class ChangeRoleUseCase {
  private readonly logger = new Logger(ChangeRoleUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    targetUserId: string,
    orgId: string,
    changedById: string,
    dto: ChangeRoleDto,
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

    // Cannot change your own role
    if (targetUserId === changedById) {
      throw new BadRequestException('You cannot change your own role');
    }

    // No-op if role is the same
    if (user.role === dto.role) {
      const { passwordHash, ...sanitized } = user;
      return sanitized;
    }

    // If demoting from ADMIN, ensure at least 1 admin remains
    if (user.role === UserRole.ADMIN && dto.role !== UserRole.ADMIN) {
      const adminCount = await this.userRepository.countAdminsInOrg(orgId);
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last admin. Promote another user to admin first.',
        );
      }
    }

    const updated = await this.userRepository.updateRole(
      targetUserId,
      dto.role,
    );

    // Audit log
    await this.auditService.log({
      orgId,
      userId: changedById,
      action: 'ROLE_CHANGED',
      targetType: 'User',
      targetId: targetUserId,
      metadata: {
        previousRole: user.role,
        newRole: dto.role,
      },
      ipAddress,
      userAgent,
    });

    // Emit event for real-time WebSocket propagation (AC2: Role updates real-time)
    this.eventEmitter.emit(EVENT_NAMES.ROLE_CHANGED, {
      orgId,
      userId: targetUserId,
      previousRole: user.role,
      newRole: dto.role,
      changedById,
    });

    this.logger.log(
      `User ${changedById} changed role of user ${targetUserId} from ${user.role} to ${dto.role} in org ${orgId}`,
    );

    const { passwordHash, ...sanitized } = updated;
    return sanitized;
  }
}
