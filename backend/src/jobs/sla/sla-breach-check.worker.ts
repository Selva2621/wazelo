import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SlaRepository } from '@/modules/sla/infrastructure/repositories/sla.repository';
import { SlaCalculationService } from '@/modules/sla/domain/services/sla-calculation.service';
import { QUEUE_NAMES, SLA_CONFIG, EVENT_NAMES } from '@/common/constants';
import {
  SlaBreachDetectedEvent,
  SlaWarningTriggeredEvent,
} from '@/events/event-bus';

interface SlaBreachCheckJobData {
  batchOffset: number;
}

@Injectable()
export class SlaBreachCheckWorker implements OnModuleInit {
  private readonly logger = new Logger(SlaBreachCheckWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly slaRepo: SlaRepository,
    private readonly slaCalc: SlaCalculationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<SlaBreachCheckJobData>(
      QUEUE_NAMES.SLA_BREACH_CHECK,
      async (job) => this.handle(job.data),
    );
    this.logger.log('SlaBreachCheckWorker subscribed');
  }

  private async handle(data: SlaBreachCheckJobData): Promise<void> {
    const now = new Date();
    const start = Date.now();

    // 1. Check for warnings (approaching deadline)
    await this.processWarnings(now);

    // 2. Check for breaches (past deadline)
    await this.processBreaches(now);

    const duration = Date.now() - start;
    this.logger.debug(`SLA breach check completed in ${duration}ms`);
  }

  private async processWarnings(now: Date): Promise<void> {
    const warnings = await this.slaRepo.findWarningDueTrackings(
      now,
      SLA_CONFIG.BREACH_CHECK_BATCH_SIZE,
    );

    for (const tracking of warnings) {
      try {
        // Mark as warning
        await this.slaRepo.updateTracking(tracking.id, {
          isWarning: true,
        });

        // Load policy for threshold info
        const policy = await this.slaRepo.findPolicyById(
          tracking.policyId,
          tracking.orgId,
        );
        if (!policy || !policy.notifyOnWarning) continue;

        const elapsed = this.slaCalc.calculateElapsedMs(
          policy,
          tracking.startedAt,
          now,
          tracking.pausedDurationMs,
        );

        this.eventEmitter.emit(EVENT_NAMES.SLA_WARNING_TRIGGERED, {
          trackingId: tracking.id,
          orgId: tracking.orgId,
          policyId: tracking.policyId,
          conversationId: tracking.conversationId,
          assignedUserId: tracking.assignedUserId,
          elapsedMs: elapsed,
          thresholdMs: policy.thresholdMs,
          warningThresholdMs: policy.warningThresholdMs!,
        } satisfies SlaWarningTriggeredEvent);
      } catch (error) {
        this.logger.error(
          `Failed to process warning for tracking=${tracking.id}: ${error}`,
        );
      }
    }

    if (warnings.length > 0) {
      this.logger.log(`Processed ${warnings.length} SLA warnings`);
    }
  }

  private async processBreaches(now: Date): Promise<void> {
    const overdue = await this.slaRepo.findOverdueTrackings(
      now,
      SLA_CONFIG.BREACH_CHECK_BATCH_SIZE,
    );

    for (const tracking of overdue) {
      try {
        const policy = await this.slaRepo.findPolicyById(
          tracking.policyId,
          tracking.orgId,
        );
        if (!policy) continue;

        const elapsed = this.slaCalc.calculateElapsedMs(
          policy,
          tracking.startedAt,
          now,
          tracking.pausedDurationMs,
        );

        // Mark tracking as breached
        await this.slaRepo.updateTracking(tracking.id, {
          isBreached: true,
          elapsedMs: elapsed,
        });

        // Create breach log (idempotent)
        const idempotencyKey = `breach:${tracking.id}:${tracking.policyId}`;
        const breach = await this.slaRepo.createBreach({
          orgId: tracking.orgId,
          policyId: tracking.policyId,
          conversationId: tracking.conversationId,
          assignedUserId: tracking.assignedUserId,
          metricType: policy.metricType,
          thresholdMs: policy.thresholdMs,
          actualMs: elapsed,
          status: 'ACTIVE',
          idempotencyKey,
        });

        // Emit breach event (triggers notifications)
        if (policy.notifyOnBreach) {
          this.eventEmitter.emit(EVENT_NAMES.SLA_BREACH_DETECTED, {
            breachId: breach.id,
            trackingId: tracking.id,
            orgId: tracking.orgId,
            policyId: tracking.policyId,
            conversationId: tracking.conversationId,
            assignedUserId: tracking.assignedUserId,
            metricType: policy.metricType,
            thresholdMs: policy.thresholdMs,
            actualMs: elapsed,
          } satisfies SlaBreachDetectedEvent);
        }

        // Queue escalation if configured
        const escalation = policy.escalationPolicy as {
          levels?: { delayMs: number; userIds: string[] }[];
        } | null;
        if (escalation?.levels?.length) {
          for (let i = 0; i < escalation.levels.length; i++) {
            const level = escalation.levels[i];
            await this.queueService.publishOnce(
              QUEUE_NAMES.SLA_ESCALATION,
              {
                breachId: breach.id,
                orgId: tracking.orgId,
                policyId: tracking.policyId,
                conversationId: tracking.conversationId,
                escalationLevel: i + 1,
                notifyUserIds: level.userIds,
              },
              `escalation:${breach.id}:level-${i + 1}`,
              { startAfter: level.delayMs / 1000 },
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to process breach for tracking=${tracking.id}: ${error}`,
        );
      }
    }

    if (overdue.length > 0) {
      this.logger.log(`Processed ${overdue.length} SLA breaches`);
    }
  }

  /**
   * Cron: runs every 30 seconds to check for SLA breaches and warnings.
   */
  @Cron(`*/${SLA_CONFIG.BREACH_CHECK_INTERVAL_SECONDS} * * * * *`)
  async scheduleBreachCheck(): Promise<void> {
    await this.queueService.publishOnce<SlaBreachCheckJobData>(
      QUEUE_NAMES.SLA_BREACH_CHECK,
      { batchOffset: 0 },
      `sla-breach-check-${Math.floor(Date.now() / (SLA_CONFIG.BREACH_CHECK_INTERVAL_SECONDS * 1000))}`,
    );
  }
}
