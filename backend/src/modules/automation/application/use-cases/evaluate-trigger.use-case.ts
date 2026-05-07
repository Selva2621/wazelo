import { Injectable, Logger } from '@nestjs/common';
import { AutomationTriggerType, AutomationExecutionStatus } from '@prisma/client';
import { AutomationRepository } from '../../infrastructure/repositories/automation.repository';
import { TriggerMatcherService } from '../../domain/services/trigger-matcher.service';
import { ConditionEvaluatorService, EvaluationContext } from '../../domain/services/condition-evaluator.service';
import { LoopPreventionService } from '../../domain/services/loop-prevention.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';

export interface TriggerEvaluationInput {
  orgId: string;
  triggerType: AutomationTriggerType;
  eventPayload: Record<string, unknown>;
  context: EvaluationContext;
  contactId?: string;
  depth?: number;
}

@Injectable()
export class EvaluateTriggerUseCase {
  private readonly logger = new Logger(EvaluateTriggerUseCase.name);

  constructor(
    private readonly automationRepo: AutomationRepository,
    private readonly triggerMatcher: TriggerMatcherService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly loopPrevention: LoopPreventionService,
    private readonly queueService: QueueService,
  ) {}

  async execute(input: TriggerEvaluationInput): Promise<number> {
    const depth = input.depth ?? 0;

    // 1. Find all active rules for this trigger type in this org
    const rules = await this.automationRepo.findActiveRulesByTriggerType(
      input.orgId,
      input.triggerType,
    );

    if (rules.length === 0) {
      return 0;
    }

    let matchedCount = 0;

    for (const rule of rules) {
      try {
        // 2. Check trigger match
        const triggerMatches = this.triggerMatcher.matches({
          triggerType: rule.triggerType,
          triggerConfig: rule.triggerConfig as Record<string, unknown>,
          eventPayload: input.eventPayload,
        });

        if (!triggerMatches) continue;

        // 3. Evaluate conditions
        const conditions = rule.conditions as any[] | null;
        const conditionsMet = this.conditionEvaluator.evaluate(
          conditions,
          input.context,
        );

        if (!conditionsMet) continue;

        // 4. Loop prevention check
        if (input.contactId) {
          const loopCheck = this.loopPrevention.canExecute(
            input.orgId,
            rule.id,
            input.contactId,
            depth,
          );

          if (!loopCheck.allowed) {
            this.logger.warn(
              `Loop prevention blocked: rule=${rule.id} contact=${input.contactId} reason=${loopCheck.reason}`,
            );
            continue;
          }
        }

        // 5. Check per-contact execution limit
        if (input.contactId && rule.maxExecutionsPerContact > 0) {
          const executionCount =
            await this.automationRepo.getExecutionCountForContactRule(
              rule.id,
              input.contactId,
            );

          if (executionCount >= rule.maxExecutionsPerContact) {
            this.logger.debug(
              `Execution limit reached: rule=${rule.id} contact=${input.contactId} count=${executionCount}`,
            );
            continue;
          }
        }

        // 6. Check cooldown
        if (input.contactId && rule.cooldownSeconds > 0) {
          const lastExecution =
            await this.automationRepo.getLastExecutionForContactRule(
              rule.id,
              input.contactId,
            );

          if (lastExecution?.completedAt) {
            const cooldownExpiry = new Date(
              lastExecution.completedAt.getTime() + rule.cooldownSeconds * 1000,
            );
            if (new Date() < cooldownExpiry) {
              this.logger.debug(
                `Cooldown active: rule=${rule.id} contact=${input.contactId} until=${cooldownExpiry.toISOString()}`,
              );
              continue;
            }
          }
        }

        // 7. Create idempotency key to prevent duplicate executions
        const idempotencyKey = this.buildIdempotencyKey(
          rule.id,
          input.contactId,
          input.triggerType,
          input.eventPayload,
        );

        // Check for existing execution with this key
        const existing =
          await this.automationRepo.findExecutionByIdempotencyKey(
            idempotencyKey,
          );

        if (existing) {
          this.logger.debug(
            `Duplicate trigger skipped: rule=${rule.id} key=${idempotencyKey}`,
          );
          continue;
        }

        // 8. Create execution log
        const execution = await this.automationRepo.createExecutionLog({
          ruleId: rule.id,
          orgId: input.orgId,
          contactId: input.contactId,
          triggerEventType: input.triggerType,
          triggerPayload: input.eventPayload as any,
          idempotencyKey,
        });

        // 9. Queue the execution job
        await this.queueService.publishOnce(
          QUEUE_NAMES.AUTOMATION_EVALUATE,
          {
            executionId: execution.id,
            ruleId: rule.id,
            orgId: input.orgId,
            contactId: input.contactId,
            depth,
          },
          `auto-eval-${execution.id}`,
        );

        // 10. Record in loop prevention
        if (input.contactId) {
          this.loopPrevention.recordExecution(
            input.orgId,
            rule.id,
            input.contactId,
            depth,
          );
        }

        matchedCount++;
      } catch (error) {
        this.logger.error(
          `Error evaluating rule ${rule.id}: ${error instanceof Error ? error.message : 'Unknown'}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    this.logger.debug(
      `Trigger evaluation complete: type=${input.triggerType} org=${input.orgId} matched=${matchedCount}/${rules.length}`,
    );

    return matchedCount;
  }

  private buildIdempotencyKey(
    ruleId: string,
    contactId: string | undefined,
    triggerType: AutomationTriggerType,
    payload: Record<string, unknown>,
  ): string {
    // Build a deterministic key based on rule + contact + trigger specifics
    const payloadKey = payload.messageId || payload.contactId || payload.eventId || '';
    return `auto-exec-${ruleId}-${contactId || 'system'}-${triggerType}-${payloadKey}`;
  }
}
