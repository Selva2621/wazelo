import { Injectable, Logger } from '@nestjs/common';
import { AutomationTriggerType, MessageDirection } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';
import { AutomationRepository } from '../../infrastructure/repositories/automation.repository';
import { EvaluateTriggerUseCase } from './evaluate-trigger.use-case';

/** Shortest wait a NO_REPLY rule can have */
const MIN_DELAY_SECONDS = 60;

export interface NoReplyCheckJob {
  orgId: string;
  ruleId: string;
  /** The outbound message the contact is expected to answer */
  messageId: string;
  conversationId: string;
  sentAt: string;
}

/**
 * NO_REPLY rules: when we message a contact, a check is scheduled per rule for after
 * its delay; if the contact still hasn't answered (and we haven't written again), the
 * rule runs for that contact.
 */
@Injectable()
export class ScheduleNoReplyChecksUseCase {
  private readonly logger = new Logger(ScheduleNoReplyChecksUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automationRepo: AutomationRepository,
    private readonly queueService: QueueService,
  ) {}

  async execute(orgId: string, messageId: string): Promise<void> {
    const rules = await this.automationRepo.findActiveRulesByTriggerType(orgId, AutomationTriggerType.NO_REPLY);
    if (rules.length === 0) return;

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, orgId },
      select: { id: true, direction: true, conversationId: true, createdAt: true, metadata: true },
    });
    if (!message || message.direction !== MessageDirection.OUTBOUND || !message.conversationId) return;

    // Campaigns and sequences pace their own follow-ups, and a nudge must not nudge itself
    const meta = (message.metadata ?? {}) as Record<string, unknown>;
    if (meta.campaignId || meta.sequenceId) return;
    const nudgeRuleIds = new Set(rules.map((r) => r.id));
    if (typeof meta.automationRuleId === 'string' && nudgeRuleIds.has(meta.automationRuleId)) return;

    for (const rule of rules) {
      const delaySeconds = Math.max(
        MIN_DELAY_SECONDS,
        Number((rule.triggerConfig as Record<string, unknown>)?.delaySeconds) || 0,
      );
      await this.queueService.publishDelayed(
        QUEUE_NAMES.AUTOMATION_NO_REPLY,
        {
          orgId,
          ruleId: rule.id,
          messageId: message.id,
          conversationId: message.conversationId,
          sentAt: message.createdAt.toISOString(),
        } satisfies NoReplyCheckJob,
        delaySeconds,
        // Sent receipts raise the same event again; one check per rule and message
        { singletonKey: `no-reply-${rule.id}-${message.id}` },
      );
    }
    this.logger.debug(`Scheduled ${rules.length} no-reply check(s) for message ${messageId}`);
  }
}

@Injectable()
export class RunNoReplyCheckUseCase {
  private readonly logger = new Logger(RunNoReplyCheckUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluateTrigger: EvaluateTriggerUseCase,
  ) {}

  async execute(job: NoReplyCheckJob): Promise<void> {
    const sentAt = new Date(job.sentAt);

    // Any later message ends this check: a reply means no nudge, and a later
    // message of ours has scheduled its own check
    const later = await this.prisma.message.findFirst({
      where: {
        orgId: job.orgId,
        conversationId: job.conversationId,
        createdAt: { gt: sentAt },
        id: { not: job.messageId },
      },
      select: { id: true },
    });
    if (later) return;

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: job.conversationId, orgId: job.orgId, deletedAt: null },
      select: { contactId: true, contactPhone: true, status: true },
    });
    if (!conversation?.contactId) return;

    await this.evaluateTrigger.execute({
      orgId: job.orgId,
      triggerType: AutomationTriggerType.NO_REPLY,
      onlyRuleId: job.ruleId,
      contactId: conversation.contactId,
      eventPayload: {
        noReplyConfirmed: true,
        // One run per unanswered message (the dedupe key uses it)
        messageId: job.messageId,
        conversationId: job.conversationId,
        sentAt: job.sentAt,
      },
      context: {
        contact: { id: conversation.contactId, phoneNumber: conversation.contactPhone },
        conversation: { id: job.conversationId, status: conversation.status },
      },
    });
    this.logger.log(`No reply to message ${job.messageId}: rule ${job.ruleId} evaluated`);
  }
}
