import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AutomationExecutionStatus } from '@prisma/client';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { AutomationRepository } from '@/modules/automation/infrastructure/repositories/automation.repository';
import { ActionExecutorService } from '@/modules/automation/domain/services/action-executor.service';
import { QUEUE_NAMES, EVENT_NAMES, AUTOMATION_CONFIG } from '@/common/constants';

export interface AutomationEvaluateJobData {
  executionId: string;
  ruleId: string;
  orgId: string;
  contactId?: string;
  depth: number;
}

@Injectable()
export class AutomationEvaluatorWorker implements OnModuleInit {
  private readonly logger = new Logger(AutomationEvaluatorWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly automationRepo: AutomationRepository,
    private readonly actionExecutor: ActionExecutorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribeConcurrent<AutomationEvaluateJobData>(
      QUEUE_NAMES.AUTOMATION_EVALUATE,
      async (job) => this.handle(job.data, job.id),
      AUTOMATION_CONFIG.WORKER_CONCURRENCY,
    );

    this.logger.log(
      `Automation evaluator worker started (concurrency=${AUTOMATION_CONFIG.WORKER_CONCURRENCY})`,
    );
  }

  private async handle(
    data: AutomationEvaluateJobData,
    jobId: string,
  ): Promise<void> {
    const startTime = Date.now();

    this.logger.debug(
      `Processing automation execution: ${data.executionId} rule=${data.ruleId} job=${jobId}`,
    );

    try {
      // 1. Mark execution as RUNNING
      await this.automationRepo.updateExecutionLog(data.executionId, {
        status: AutomationExecutionStatus.RUNNING,
        startedAt: new Date(),
      });

      // 2. Load the rule with actions
      const rule = await this.automationRepo.findRuleByIdAndOrg(
        data.ruleId,
        data.orgId,
      );

      if (!rule) {
        this.logger.warn(`Rule not found: ${data.ruleId}, skipping execution`);
        await this.automationRepo.updateExecutionLog(data.executionId, {
          status: AutomationExecutionStatus.SKIPPED,
          completedAt: new Date(),
          error: 'Rule not found or deleted',
          executionTimeMs: Date.now() - startTime,
        });
        return;
      }

      // 3. Check if rule is still active
      if (rule.status !== 'ACTIVE') {
        this.logger.debug(`Rule ${data.ruleId} is no longer active, skipping`);
        await this.automationRepo.updateExecutionLog(data.executionId, {
          status: AutomationExecutionStatus.SKIPPED,
          completedAt: new Date(),
          error: 'Rule is disabled',
          executionTimeMs: Date.now() - startTime,
        });
        return;
      }

      // 4. Load trigger payload for variable interpolation in actions
      const triggerPayload = await this.automationRepo.findExecutionTriggerPayload(data.executionId);
      const eventPayload = triggerPayload ?? undefined;

      // 5. Execute actions in order
      const actionResults: Record<string, unknown>[] = [];

      for (const action of rule.actions) {
        // Handle delayed actions
        if (action.delaySeconds > 0) {
          await this.queueService.publishDelayed(
            QUEUE_NAMES.AUTOMATION_EXECUTE_ACTION,
            {
              executionId: data.executionId,
              ruleId: data.ruleId,
              orgId: data.orgId,
              contactId: data.contactId,
              actionId: action.id,
              actionType: action.actionType,
              actionConfig: action.actionConfig,
              depth: data.depth,
              eventPayload,
            },
            action.delaySeconds,
          );

          actionResults.push({
            actionId: action.id,
            actionType: action.actionType,
            delayed: true,
            delaySeconds: action.delaySeconds,
          });

          continue;
        }

        // Execute immediate actions
        const result = await this.actionExecutor.execute({
          orgId: data.orgId,
          contactId: data.contactId || '',
          actionType: action.actionType,
          actionConfig: action.actionConfig as Record<string, unknown>,
          executionId: data.executionId,
          ruleId: data.ruleId,
          eventPayload,
        });

        actionResults.push(result as any);

        // Stop execution chain on failure
        if (!result.success) {
          this.logger.warn(
            `Action failed: ${action.id} type=${action.actionType} error=${result.error}`,
          );
          break;
        }
      }

      // 5. Determine final status
      const hasFailure = actionResults.some(
        (r) => (r as any).success === false,
      );
      const finalStatus = hasFailure
        ? AutomationExecutionStatus.FAILED
        : AutomationExecutionStatus.COMPLETED;
      const executionTimeMs = Date.now() - startTime;

      // 6. Update execution log
      await this.automationRepo.updateExecutionLog(data.executionId, {
        status: finalStatus,
        actionResults: actionResults as any,
        completedAt: new Date(),
        executionTimeMs,
        ...(hasFailure && {
          error: actionResults
            .filter((r) => (r as any).success === false)
            .map((r) => (r as any).error)
            .join('; '),
        }),
      });

      // 7. Increment rule execution count
      await this.automationRepo.incrementExecutionCount(data.ruleId);

      // 8. Emit completion event
      const eventName = hasFailure
        ? EVENT_NAMES.AUTOMATION_FAILED
        : EVENT_NAMES.AUTOMATION_EXECUTED;

      this.eventEmitter.emit(eventName, {
        executionId: data.executionId,
        ruleId: data.ruleId,
        orgId: data.orgId,
        contactId: data.contactId,
        ...(hasFailure
          ? {
              error: actionResults
                .filter((r) => (r as any).success === false)
                .map((r) => (r as any).error)
                .join('; '),
              retryCount: 0,
            }
          : {
              actionResults,
              executionTimeMs,
            }),
      });

      this.logger.log(
        `Automation execution ${finalStatus}: ${data.executionId} rule=${data.ruleId} time=${executionTimeMs}ms`,
      );
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Automation execution error: ${data.executionId} rule=${data.ruleId}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.automationRepo.updateExecutionLog(data.executionId, {
        status: AutomationExecutionStatus.FAILED,
        error: errorMessage,
        completedAt: new Date(),
        executionTimeMs,
      });

      this.eventEmitter.emit(EVENT_NAMES.AUTOMATION_FAILED, {
        executionId: data.executionId,
        ruleId: data.ruleId,
        orgId: data.orgId,
        contactId: data.contactId,
        error: errorMessage,
        retryCount: 0,
      });

      throw error; // Let pg-boss handle retry
    }
  }
}
