import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { User } from '@prisma/client';

@Injectable()
export class UpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    targetUserId: string,
    orgId: string,
    updatedById: string,
    dto: UpdateUserDto,
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

    // Build changes record for audit
    const changes: Record<string, unknown> = {};
    if (dto.firstName !== undefined && dto.firstName !== user.firstName) {
      changes.firstName = { from: user.firstName, to: dto.firstName };
    }
    if (dto.lastName !== undefined && dto.lastName !== user.lastName) {
      changes.lastName = { from: user.lastName, to: dto.lastName };
    }

    if (Object.keys(changes).length === 0) {
      const { passwordHash, ...sanitized } = user;
      return sanitized;
    }

    const updated = await this.userRepository.updateUser(targetUserId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    // Audit log
    await this.auditService.log({
      orgId,
      userId: updatedById,
      action: 'USER_UPDATED',
      targetType: 'User',
      targetId: targetUserId,
      metadata: { changes },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `User ${updatedById} updated user ${targetUserId} in org ${orgId}`,
    );

    const { passwordHash, ...sanitized } = updated;
    return sanitized;
  }
}
