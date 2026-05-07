import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction, ScheduledMessageStatus } from '@prisma/client';
import { SchedulerRepository } from '../../infrastructure/repositories/scheduler.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { UpdateScheduledMessageDto } from '../dto';
import { EVENT_NAMES } from '@/common/constants';

@Injectable()
export class UpdateScheduledMessageUseCase {
  private readonly logger = new Logger(UpdateScheduledMessageUseCase.name);

  constructor(
    private readonly schedulerRepo: SchedulerRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    id: string,
    orgId: string,
    userId: string,
    dto: UpdateScheduledMessageDto,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Load existing
    const existing = await this.schedulerRepo.findByIdAndOrg(id, orgId);
    if (!existing) {
      throw new NotFoundException('Scheduled message not found');
    }

    // 2. Only PENDING messages can be edited
    if (existing.status !== ScheduledMessageStatus.PENDING) {
      throw new BadRequestException(
        `Cannot edit scheduled message with status ${existing.status}`,
      );
    }

    // 3. Validate new scheduled time if provided
    if (dto.scheduledAt) {
      const newTime = new Date(dto.scheduledAt);
      if (newTime.getTime() <= Date.now()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
    }

    // 4. Build update data
    const updateData: Record<string, unknown> = {};
    if (dto.messageType !== undefined) updateData.messageType = dto.messageType;
    if (dto.messageBody !== undefined) updateData.messageBody = dto.messageBody;
    if (dto.mediaUrl !== undefined) updateData.mediaUrl = dto.mediaUrl;
    if (dto.mediaMimeType !== undefined) updateData.mediaMimeType = dto.mediaMimeType;
    if (dto.scheduledAt !== undefined) updateData.scheduledAt = new Date(dto.scheduledAt);
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata;

    const updated = await this.schedulerRepo.updatePending(id, orgId, updateData as any);
    if (!updated) {
      throw new BadRequestException(
        'Scheduled message was already processed or modified concurrently',
      );
    }

    // 5. Emit event
    this.eventEmitter.emit(EVENT_NAMES.SCHEDULED_MESSAGE_UPDATED, {
      scheduledMessageId: id,
      orgId,
      updatedById: userId,
    });

    // 6. Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SCHEDULED_MESSAGE_UPDATED,
      targetType: 'ScheduledMessage',
      targetId: id,
      metadata: { changes: Object.keys(updateData) },
      ipAddress,
      userAgent,
    });

    return updated;
  }
}
