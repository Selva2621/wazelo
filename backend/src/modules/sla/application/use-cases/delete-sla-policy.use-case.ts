import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { SlaRepository } from '../../infrastructure/repositories/sla.repository';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction } from '@prisma/client';
import { SlaPolicyDeletedEvent } from '@/events/event-bus';

@Injectable()
export class DeleteSlaPolicyUseCase {
  private readonly logger = new Logger(DeleteSlaPolicyUseCase.name);

  constructor(
    private readonly slaRepo: SlaRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    policyId: string,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    const existing = await this.slaRepo.findPolicyById(policyId, orgId);
    if (!existing) {
      throw new NotFoundException('SLA policy not found');
    }

    await this.slaRepo.softDeletePolicy(policyId, orgId);

    // Audit
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SLA_POLICY_DELETED,
      targetId: policyId,
      metadata: { name: existing.name },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    // Event
    this.eventEmitter.emit(EVENT_NAMES.SLA_POLICY_DELETED, {
      policyId,
      orgId,
      deletedById: userId,
    } satisfies SlaPolicyDeletedEvent);

    this.logger.log(
      `SLA policy deleted: id=${policyId} name="${existing.name}" org=${orgId}`,
    );

    return { success: true };
  }
}
