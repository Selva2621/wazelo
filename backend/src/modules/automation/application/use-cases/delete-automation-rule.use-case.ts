import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction, AutomationRuleStatus } from '@prisma/client';
import { AutomationRepository } from '../../infrastructure/repositories/automation.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';

@Injectable()
export class DeleteAutomationRuleUseCase {
  private readonly logger = new Logger(DeleteAutomationRuleUseCase.name);

  constructor(
    private readonly automationRepo: AutomationRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    ruleId: string,
    orgId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const existing = await this.automationRepo.findRuleByIdAndOrg(ruleId, orgId);
    if (!existing) {
      throw new NotFoundException('Automation rule not found');
    }

    // Must disable before deleting to prevent mid-execution deletion
    if (existing.status === AutomationRuleStatus.ACTIVE) {
      throw new BadRequestException(
        'Disable the rule before deleting it',
      );
    }

    await this.automationRepo.softDelete(ruleId, orgId);

    this.eventEmitter.emit(EVENT_NAMES.AUTOMATION_RULE_DELETED, {
      ruleId,
      orgId,
      deletedById: userId,
    });

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.AUTOMATION_RULE_DELETED,
      targetType: 'AutomationRule',
      targetId: ruleId,
      metadata: { name: existing.name },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Automation rule deleted: ${ruleId} org=${orgId}`);
  }
}
