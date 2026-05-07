import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SlaRepository } from '@/modules/sla/infrastructure/repositories/sla.repository';
import { SlaCalculationService } from '@/modules/sla/domain/services/sla-calculation.service';
import { QUEUE_NAMES, SLA_CONFIG, EVENT_NAMES } from '@/common/constants';
import { SlaTrackingStartedEvent, SlaBreachResolvedEvent } from '@/events/event-bus';

export interface SlaEvaluateJobData {
  type: 'inbound_message' | 'outbound_reply' | 'conversation_resolved';
  orgId: string;
  conversationId: string;
  sessionId: string;
  assignedUserId: string | null;
  messageCreatedAt: string; // ISO date
}

@Injectable()
export class SlaEvaluateWorker implements OnModuleInit {
  private readonly logger = new Logger(SlaEvaluateWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly slaRepo: SlaRepository,
    private readonly slaCalc: SlaCalculationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribeConcurrent<SlaEvaluateJobData>(
      QUEUE_NAMES.SLA_EVALUATE,
      async (job) => this.handle(job.data, job.id),
      SLA_CONFIG.WORKER_CONCURRENCY,
    );
    this.logger.log('SlaEvaluateWorker subscribed');
  }

  private async handle(data: SlaEvaluateJobData, jobId: string): Promise<void> {
    switch (data.type) {
      case 'inbound_message':
        await this.handleInboundMessage(data);
        break;
      case 'outbound_reply':
        await this.handleOutboundReply(data);
        break;
      case 'conversation_resolved':
        await this.handleConversationResolved(data);
        break;
      default:
        this.logger.warn(`Unknown SLA evaluate type: ${(data as { type: string }).type}`);
    }
  }

  /**
   * When an inbound message is received, start SLA tracking for all
   * active policies of type FIRST_RESPONSE_TIME in that org.
   */
  private async handleInboundMessage(data: SlaEvaluateJobData): Promise<void> {
    const policies = await this.slaRepo.findActivePolicies(data.orgId);
    const messageTime = new Date(data.messageCreatedAt);

    for (const policy of policies) {
      if (policy.metricType !== 'FIRST_RESPONSE_TIME') continue;

      // Skip if outside business hours
      if (!this.slaCalc.isWithinBusinessHours(policy, messageTime)) continue;

      // Check if already tracking this conversation for this policy
      const existing = await this.slaRepo.findActiveTrackingByConversation(
        data.orgId,
        data.conversationId,
        policy.id,
      );
      if (existing) continue; // Already tracking

      const { deadlineAt, warningAt } = this.slaCalc.calculateDeadline(
        policy,
        messageTime,
      );

      const idempotencyKey = `sla:${policy.id}:${data.conversationId}:${data.messageCreatedAt}`;

      const tracking = await this.slaRepo.upsertTracking(idempotencyKey, {
        orgId: data.orgId,
        policyId: policy.id,
        conversationId: data.conversationId,
        assignedUserId: data.assignedUserId,
        startedAt: messageTime,
        deadlineAt,
        warningAt,
        idempotencyKey,
      });

      this.eventEmitter.emit(EVENT_NAMES.SLA_TRACKING_STARTED, {
        trackingId: tracking.id,
        orgId: data.orgId,
        policyId: policy.id,
        conversationId: data.conversationId,
        assignedUserId: data.assignedUserId,
        deadlineAt: deadlineAt.toISOString(),
      } satisfies SlaTrackingStartedEvent);

      this.logger.debug(
        `SLA tracking started: policy=${policy.name} conversation=${data.conversationId} deadline=${deadlineAt.toISOString()}`,
      );
    }
  }

  /**
   * When an outbound reply is sent, resolve any active FIRST_RESPONSE_TIME
   * trackings and record the elapsed time.
   */
  private async handleOutboundReply(data: SlaEvaluateJobData): Promise<void> {
    const policies = await this.slaRepo.findActivePolicies(data.orgId);
    const replyTime = new Date(data.messageCreatedAt);

    for (const policy of policies) {
      if (policy.metricType !== 'FIRST_RESPONSE_TIME') continue;

      const tracking = await this.slaRepo.findActiveTrackingByConversation(
        data.orgId,
        data.conversationId,
        policy.id,
      );
      if (!tracking) continue;

      const elapsed = this.slaCalc.calculateElapsedMs(
        policy,
        tracking.startedAt,
        replyTime,
        tracking.pausedDurationMs,
      );

      const isBreached = elapsed > policy.thresholdMs;

      await this.slaRepo.updateTracking(tracking.id, {
        respondedAt: replyTime,
        elapsedMs: elapsed,
        isBreached,
      });

      // If this tracking had a breach log, resolve it
      if (isBreached) {
        // The breach was already created by the breach checker;
        // we just mark elapsed accurately
        this.logger.debug(
          `SLA tracking resolved (breached): tracking=${tracking.id} elapsed=${elapsed}ms threshold=${policy.thresholdMs}ms`,
        );
      } else {
        this.eventEmitter.emit(EVENT_NAMES.SLA_BREACH_RESOLVED, {
          breachId: '', // no breach to resolve
          trackingId: tracking.id,
          orgId: data.orgId,
          policyId: policy.id,
          conversationId: data.conversationId,
          resolvedMs: elapsed,
        } satisfies SlaBreachResolvedEvent);

        this.logger.debug(
          `SLA tracking resolved (within SLA): tracking=${tracking.id} elapsed=${elapsed}ms threshold=${policy.thresholdMs}ms`,
        );
      }
    }
  }

  /**
   * When a conversation is resolved/closed, resolve any active RESOLUTION_TIME
   * trackings.
   */
  private async handleConversationResolved(data: SlaEvaluateJobData): Promise<void> {
    const policies = await this.slaRepo.findActivePolicies(data.orgId);
    const resolveTime = new Date(data.messageCreatedAt);

    for (const policy of policies) {
      if (policy.metricType !== 'RESOLUTION_TIME') continue;

      const tracking = await this.slaRepo.findActiveTrackingByConversation(
        data.orgId,
        data.conversationId,
        policy.id,
      );
      if (!tracking) continue;

      const elapsed = this.slaCalc.calculateElapsedMs(
        policy,
        tracking.startedAt,
        resolveTime,
        tracking.pausedDurationMs,
      );

      const isBreached = elapsed > policy.thresholdMs;

      await this.slaRepo.updateTracking(tracking.id, {
        resolvedAt: resolveTime,
        elapsedMs: elapsed,
        isBreached,
      });

      this.logger.debug(
        `SLA resolution tracking resolved: tracking=${tracking.id} elapsed=${elapsed}ms breached=${isBreached}`,
      );
    }
  }
}
