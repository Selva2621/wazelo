import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '@prisma/client';
import { AutomationRepository } from '../../infrastructure/repositories/automation.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { CreateAutomationRuleDto } from '../dto';
import { AUTOMATION_CONFIG, EVENT_NAMES } from '@/common/constants';

@Injectable()
export class CreateAutomationRuleUseCase {
  private readonly logger = new Logger(CreateAutomationRuleUseCase.name);

  constructor(
    private readonly automationRepo: AutomationRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: CreateAutomationRuleDto,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Check org limit
    const existingCount = await this.automationRepo.countByOrg(orgId);
    if (existingCount >= AUTOMATION_CONFIG.MAX_RULES_PER_ORG) {
      throw new BadRequestException(
        `Maximum automation rules limit (${AUTOMATION_CONFIG.MAX_RULES_PER_ORG}) reached`,
      );
    }

    // 2. Validate actions count
    if (dto.actions.length > AUTOMATION_CONFIG.MAX_ACTIONS_PER_RULE) {
      throw new BadRequestException(
        `Maximum ${AUTOMATION_CONFIG.MAX_ACTIONS_PER_RULE} actions per rule allowed`,
      );
    }

    if (dto.actions.length === 0) {
      throw new BadRequestException('At least one action is required');
    }

    // 3. Create rule with actions in a single transaction
    const rule = await this.automationRepo.createRule(
      {
        orgId,
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig as any,
        conditions: dto.conditions as any,
        priority: dto.priority,
        maxExecutionsPerContact: dto.maxExecutionsPerContact,
        cooldownSeconds: dto.cooldownSeconds ?? AUTOMATION_CONFIG.DEFAULT_COOLDOWN_SECONDS,
        createdById: userId,
        productId: dto.productId,
      },
      dto.actions.map((a, idx) => ({
        actionType: a.actionType,
        actionConfig: a.actionConfig as any,
        orderIndex: a.orderIndex ?? idx,
        delaySeconds: a.delaySeconds,
      })),
    );

    // 4. Emit event
    this.eventEmitter.emit(EVENT_NAMES.AUTOMATION_RULE_CREATED, {
      ruleId: rule.id,
      orgId,
      createdById: userId,
      triggerType: rule.triggerType,
      name: rule.name,
    });

    // 5. Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.AUTOMATION_RULE_CREATED,
      targetType: 'AutomationRule',
      targetId: rule.id,
      metadata: {
        name: rule.name,
        triggerType: rule.triggerType,
        actionsCount: rule.actions.length,
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Automation rule created: ${rule.id} org=${orgId}`);

    return rule;
  }
}
