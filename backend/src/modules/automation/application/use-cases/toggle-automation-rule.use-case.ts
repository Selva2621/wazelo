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
export class ToggleAutomationRuleUseCase {
  private readonly logger = new Logger(ToggleAutomationRuleUseCase.name);

  constructor(
    private readonly automationRepo: AutomationRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    ruleId: string,
    orgId: string,
    userId: string,
    enable: boolean,
    ipAddress: string,
    userAgent: string,
  ) {
    const existing = await this.automationRepo.findRuleByIdAndOrg(ruleId, orgId);
    if (!existing) {
      throw new NotFoundException('Automation rule not found');
    }

    const expectedStatus = enable
      ? AutomationRuleStatus.INACTIVE
      : AutomationRuleStatus.ACTIVE;
    const newStatus = enable
      ? AutomationRuleStatus.ACTIVE
      : AutomationRuleStatus.INACTIVE;

    if (existing.status === newStatus) {
      throw new BadRequestException(
        `Rule is already ${newStatus.toLowerCase()}`,
      );
    }

    const result = await this.automationRepo.transitionStatus(
      ruleId,
      orgId,
      expectedStatus,
      newStatus,
    );

    if (!result) {
      throw new BadRequestException('Concurrent modification detected');
    }

    // Emit event
    const eventName = enable
      ? EVENT_NAMES.AUTOMATION_RULE_ENABLED
      : EVENT_NAMES.AUTOMATION_RULE_DISABLED;

    this.eventEmitter.emit(eventName, {
      ruleId,
      orgId,
      [`${enable ? 'enabled' : 'disabled'}ById`]: userId,
    });

    // Audit log
    const auditAction = enable
      ? AuditAction.AUTOMATION_RULE_ENABLED
      : AuditAction.AUTOMATION_RULE_DISABLED;

    await this.auditService.log({
      orgId,
      userId,
      action: auditAction,
      targetType: 'AutomationRule',
      targetId: ruleId,
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `Automation rule ${enable ? 'enabled' : 'disabled'}: ${ruleId} org=${orgId}`,
    );

    return result;
  }
}
