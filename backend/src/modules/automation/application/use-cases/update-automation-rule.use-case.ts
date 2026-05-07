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
import { UpdateAutomationRuleDto } from '../dto';
import { AUTOMATION_CONFIG, EVENT_NAMES } from '@/common/constants';

@Injectable()
export class UpdateAutomationRuleUseCase {
  private readonly logger = new Logger(UpdateAutomationRuleUseCase.name);

  constructor(
    private readonly automationRepo: AutomationRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    ruleId: string,
    orgId: string,
    userId: string,
    dto: UpdateAutomationRuleDto,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Load existing rule
    const existing = await this.automationRepo.findRuleByIdAndOrg(ruleId, orgId);
    if (!existing) {
      throw new NotFoundException('Automation rule not found');
    }

    // 2. Only allow updates on INACTIVE rules to prevent mid-execution config changes
    if (existing.status === AutomationRuleStatus.ACTIVE && (dto.triggerType || dto.triggerConfig || dto.actions)) {
      throw new BadRequestException(
        'Disable the rule before modifying trigger, conditions, or actions',
      );
    }

    // 3. Validate actions if provided
    if (dto.actions) {
      if (dto.actions.length > AUTOMATION_CONFIG.MAX_ACTIONS_PER_RULE) {
        throw new BadRequestException(
          `Maximum ${AUTOMATION_CONFIG.MAX_ACTIONS_PER_RULE} actions per rule allowed`,
        );
      }
      if (dto.actions.length === 0) {
        throw new BadRequestException('At least one action is required');
      }
    }

    // 4. Update rule fields
    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.triggerType !== undefined) updateData.triggerType = dto.triggerType;
    if (dto.triggerConfig !== undefined) updateData.triggerConfig = dto.triggerConfig;
    if (dto.conditions !== undefined) updateData.conditions = dto.conditions;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.maxExecutionsPerContact !== undefined)
      updateData.maxExecutionsPerContact = dto.maxExecutionsPerContact;
    if (dto.cooldownSeconds !== undefined) updateData.cooldownSeconds = dto.cooldownSeconds;

    const updated = await this.automationRepo.updateRule(ruleId, orgId, updateData as any);
    if (!updated) {
      throw new BadRequestException('Concurrent modification detected');
    }

    // 5. Replace actions if provided
    if (dto.actions) {
      await this.automationRepo.replaceActions(
        ruleId,
        orgId,
        dto.actions.map((a, idx) => ({
          actionType: a.actionType,
          actionConfig: a.actionConfig as any,
          orderIndex: a.orderIndex ?? idx,
          delaySeconds: a.delaySeconds,
        })),
      );
    }

    // 6. Reload with updated actions
    const result = await this.automationRepo.findRuleByIdAndOrg(ruleId, orgId);

    // 7. Emit event
    this.eventEmitter.emit(EVENT_NAMES.AUTOMATION_RULE_UPDATED, {
      ruleId,
      orgId,
      updatedById: userId,
    });

    // 8. Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.AUTOMATION_RULE_UPDATED,
      targetType: 'AutomationRule',
      targetId: ruleId,
      metadata: { changes: Object.keys(updateData) },
      ipAddress,
      userAgent,
    });

    return result;
  }
}
