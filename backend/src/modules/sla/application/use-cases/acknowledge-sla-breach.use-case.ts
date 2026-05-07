import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { SlaRepository } from '../../infrastructure/repositories/sla.repository';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction } from '@prisma/client';
import { SlaBreachAcknowledgedEvent } from '@/events/event-bus';

@Injectable()
export class AcknowledgeSlaBreachUseCase {
  private readonly logger = new Logger(AcknowledgeSlaBreachUseCase.name);

  constructor(
    private readonly slaRepo: SlaRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    breachId: string,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    const breach = await this.slaRepo.findBreachById(breachId, orgId);
    if (!breach) {
      throw new NotFoundException('SLA breach not found');
    }

    if (breach.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot acknowledge breach in status "${breach.status}"`,
      );
    }

    const updated = await this.slaRepo.acknowledgeBreach(breachId, orgId, userId);

    // Audit
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SLA_BREACH_ACKNOWLEDGED,
      targetId: breachId,
      metadata: {
        policyId: breach.policyId,
        conversationId: breach.conversationId,
      },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    // Event
    this.eventEmitter.emit(EVENT_NAMES.SLA_BREACH_ACKNOWLEDGED, {
      breachId,
      orgId,
      acknowledgedById: userId,
    } satisfies SlaBreachAcknowledgedEvent);

    this.logger.log(`SLA breach acknowledged: id=${breachId} by=${userId}`);

    return updated;
  }
}
