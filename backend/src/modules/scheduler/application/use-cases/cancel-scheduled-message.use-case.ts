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
import { QueueService } from '@/infrastructure/queue/queue.service';
import { EVENT_NAMES } from '@/common/constants';

@Injectable()
export class CancelScheduledMessageUseCase {
  private readonly logger = new Logger(CancelScheduledMessageUseCase.name);

  constructor(
    private readonly schedulerRepo: SchedulerRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly queueService: QueueService,
  ) {}

  async execute(
    id: string,
    orgId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Load existing
    const existing = await this.schedulerRepo.findByIdAndOrg(id, orgId);
    if (!existing) {
      throw new NotFoundException('Scheduled message not found');
    }

    // 2. Only PENDING or QUEUED can be cancelled
    if (
      existing.status !== ScheduledMessageStatus.PENDING &&
      existing.status !== ScheduledMessageStatus.QUEUED
    ) {
      throw new BadRequestException(
        `Cannot cancel scheduled message with status ${existing.status}`,
      );
    }

    // 3. Cancel in database
    const cancelled = await this.schedulerRepo.transitionStatus(
      id,
      existing.status,
      ScheduledMessageStatus.CANCELLED,
    );

    if (!cancelled) {
      throw new BadRequestException('Concurrent modification detected');
    }

    // 4. If it had a pg-boss job, cancel it
    if (existing.pgBossJobId) {
      try {
        await this.queueService.cancel(existing.pgBossJobId);
      } catch (error) {
        this.logger.warn(
          `Failed to cancel pg-boss job ${existing.pgBossJobId}: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    }

    // 5. Emit event
    this.eventEmitter.emit(EVENT_NAMES.SCHEDULED_MESSAGE_CANCELLED, {
      scheduledMessageId: id,
      orgId,
      cancelledById: userId,
    });

    // 6. Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SCHEDULED_MESSAGE_CANCELLED,
      targetType: 'ScheduledMessage',
      targetId: id,
      metadata: {
        contactPhone: existing.contactPhone,
        scheduledAt: existing.scheduledAt.toISOString(),
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Scheduled message cancelled: ${id} org=${orgId}`);

    return cancelled;
  }
}
