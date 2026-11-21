import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AutomationActionType } from '@prisma/client';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';
import { AutomationRepository } from '@/modules/automation/infrastructure/repositories/automation.repository';
import { ActionExecutorService } from '@/modules/automation/domain/services/action-executor.service';

/** A rule step with a delay ("wait 2 hours, then …"), queued by the automation evaluator */
export interface DelayedActionJob {
  executionId: string;
  ruleId: string;
  orgId: string;
  contactId?: string;
  actionId: string;
  actionType: AutomationActionType;
  actionConfig: Record<string, unknown>;
  eventPayload?: Record<string, unknown>;
}

/**
 * Runs delayed automation steps when their wait is over. Skipped if the rule was
 * turned off or deleted in the meantime; the step itself applies the usual checks
 * (opt-out, deleted contact, sending hours…).
 */
@Injectable()
export class AutomationActionWorker implements OnModuleInit {
  private readonly logger = new Logger(AutomationActionWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly automationRepo: AutomationRepository,
    private readonly actionExecutor: ActionExecutorService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<DelayedActionJob>(QUEUE_NAMES.AUTOMATION_EXECUTE_ACTION, async (job) => {
      await this.run(job.data);
    });
    this.logger.log('Delayed automation action worker started');
  }

  async run(job: DelayedActionJob): Promise<void> {
    // Older queue entries without an action type have nothing to run
    if (!job.actionType) return;

    const rule = await this.automationRepo.findRuleByIdAndOrg(job.ruleId, job.orgId);
    if (!rule || rule.status !== 'ACTIVE') {
      this.logger.debug(`Delayed step of rule ${job.ruleId} skipped: rule is off or gone`);
      return;
    }

    const result = await this.actionExecutor.execute({
      orgId: job.orgId,
      contactId: job.contactId || '',
      actionType: job.actionType,
      actionConfig: job.actionConfig ?? {},
      executionId: job.executionId,
      ruleId: job.ruleId,
      eventPayload: job.eventPayload,
    });
    if (!result.success) {
      this.logger.warn(`Delayed ${job.actionType} for rule ${job.ruleId} failed: ${result.error}`);
    }
  }
}
