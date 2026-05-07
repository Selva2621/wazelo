import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserStatus } from '@prisma/client';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';
import { User } from '@prisma/client';

@Injectable()
export class EnableUserUseCase {
  private readonly logger = new Logger(EnableUserUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    targetUserId: string,
    orgId: string,
    enabledById: string,
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

    // Only suspended users can be re-enabled
    if (user.status !== UserStatus.SUSPENDED) {
      throw new BadRequestException(
        `User is not disabled. Current status: ${user.status}`,
      );
    }

    const updated = await this.userRepository.updateStatus(
      targetUserId,
      UserStatus.ACTIVE,
    );

    // Audit log
    await this.auditService.log({
      orgId,
      userId: enabledById,
      action: 'USER_ENABLED',
      targetType: 'User',
      targetId: targetUserId,
      metadata: { email: user.email },
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.USER_ENABLED, {
      orgId,
      userId: targetUserId,
      enabledById,
    });

    this.logger.log(
      `User ${enabledById} re-enabled user ${targetUserId} in org ${orgId}`,
    );

    const { passwordHash, ...sanitized } = updated;
    return sanitized;
  }
}
