import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '@prisma/client';
import { SchedulerRepository } from '../../infrastructure/repositories/scheduler.repository';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { CreateScheduledMessageDto } from '../dto';
import { SCHEDULER_CONFIG, EVENT_NAMES } from '@/common/constants';

@Injectable()
export class CreateScheduledMessageUseCase {
  private readonly logger = new Logger(CreateScheduledMessageUseCase.name);

  constructor(
    private readonly schedulerRepo: SchedulerRepository,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: CreateScheduledMessageDto,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Validate scheduled time is in the future
    const scheduledAt = new Date(dto.scheduledAt);
    const now = new Date();
    if (scheduledAt.getTime() <= now.getTime()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    // 2. Validate session exists and belongs to org
    const session = await this.sessionRepo.findByIdAndOrg(
      dto.sessionId,
      orgId,
    );
    if (!session) {
      throw new NotFoundException('WhatsApp session not found');
    }

    // 3. Validate message content
    if (dto.messageType === 'TEXT' && !dto.messageBody) {
      throw new BadRequestException('Message body is required for TEXT messages');
    }

    if (['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'].includes(dto.messageType) && !dto.mediaUrl) {
      throw new BadRequestException('Media URL is required for media messages');
    }

    // 4. Create scheduled message
    const scheduled = await this.schedulerRepo.create({
      orgId,
      sessionId: dto.sessionId,
      contactPhone: dto.contactPhone,
      messageType: dto.messageType,
      messageBody: dto.messageBody,
      mediaUrl: dto.mediaUrl,
      mediaMimeType: dto.mediaMimeType,
      scheduledAt,
      timezone: dto.timezone || 'UTC',
      createdById: userId,
      metadata: dto.metadata as any,
      productId: dto.productId,
    });

    // 5. Emit event
    this.eventEmitter.emit(EVENT_NAMES.SCHEDULED_MESSAGE_CREATED, {
      scheduledMessageId: scheduled.id,
      orgId,
      createdById: userId,
      scheduledAt: scheduled.scheduledAt.toISOString(),
      contactPhone: scheduled.contactPhone,
    });

    // 6. Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SCHEDULED_MESSAGE_CREATED,
      targetType: 'ScheduledMessage',
      targetId: scheduled.id,
      metadata: {
        contactPhone: scheduled.contactPhone,
        scheduledAt: scheduled.scheduledAt.toISOString(),
        messageType: scheduled.messageType,
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `Scheduled message created: ${scheduled.id} for ${scheduled.scheduledAt.toISOString()} org=${orgId}`,
    );

    return scheduled;
  }
}
