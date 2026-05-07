import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AutomationRuleStatus } from '@prisma/client';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AutomationRepository } from '@/modules/automation/infrastructure/repositories/automation.repository';
import { OutboundMessageService } from '@/modules/messages/application/services/outbound-message.service';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';

export interface FollowUpCheckJobData {
  ruleId: string;
  orgId: string;
  contactId: string;
  contactPhone: string;
  conversationId: string;
  sessionId: string;
  delaySeconds: number;
  scheduledCheckAt: string;
}

@Injectable()
export class FollowUpWorker implements OnModuleInit {
  private readonly logger = new Logger(FollowUpWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
    private readonly automationRepo: AutomationRepository,
    private readonly outboundMessage: OutboundMessageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<FollowUpCheckJobData>(
      QUEUE_NAMES.FOLLOW_UP_CHECK,
      async (job) => this.handleFollowUpCheck(job.data, job.id),
    );

    this.logger.log('Follow-up worker started');
  }

  private async handleFollowUpCheck(
    data: FollowUpCheckJobData,
    jobId: string,
  ): Promise<void> {
    this.logger.debug(
      `Checking follow-up: rule=${data.ruleId} contact=${data.contactId} job=${jobId}`,
    );

    try {
      // 1. Check if rule is still active
      const rule = await this.automationRepo.findRuleByIdAndOrg(
        data.ruleId,
        data.orgId,
      );

      if (!rule || rule.status !== AutomationRuleStatus.ACTIVE) {
        this.logger.debug(`Rule ${data.ruleId} is no longer active, skipping follow-up`);
        return;
      }

      // 2. Check if contact has opted out
      const contact = await this.prisma.contact.findFirst({
        where: {
          id: data.contactId,
          orgId: data.orgId,
          optedOut: false,
          deletedAt: null,
        },
      });

      if (!contact) {
        this.logger.debug(
          `Contact ${data.contactId} not found or opted out, cancelling follow-up`,
        );

        this.eventEmitter.emit(EVENT_NAMES.FOLLOW_UP_CANCELLED, {
          ruleId: data.ruleId,
          orgId: data.orgId,
          contactId: data.contactId,
          reason: 'Contact not found or opted out',
        });

        return;
      }

      // 3. Check if contact has replied since the follow-up was scheduled
      const scheduledCheckAt = new Date(data.scheduledCheckAt);
      const recentInboundMessage = await this.prisma.message.findFirst({
        where: {
          orgId: data.orgId,
          contactPhone: data.contactPhone,
          direction: 'INBOUND',
          createdAt: { gte: scheduledCheckAt },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentInboundMessage) {
        this.logger.debug(
          `Contact ${data.contactId} has replied since follow-up was scheduled, cancelling`,
        );

        this.eventEmitter.emit(EVENT_NAMES.FOLLOW_UP_CANCELLED, {
          ruleId: data.ruleId,
          orgId: data.orgId,
          contactId: data.contactId,
          reason: 'Contact replied before follow-up execution',
        });

        return;
      }

      // 4. Check conversation state — only send if conversation is still open
      if (data.conversationId) {
        const conversation = await this.prisma.conversation.findFirst({
          where: {
            id: data.conversationId,
            orgId: data.orgId,
            status: 'OPEN',
            deletedAt: null,
          },
        });

        if (!conversation) {
          this.logger.debug(
            `Conversation ${data.conversationId} is closed, cancelling follow-up`,
          );

          this.eventEmitter.emit(EVENT_NAMES.FOLLOW_UP_CANCELLED, {
            ruleId: data.ruleId,
            orgId: data.orgId,
            contactId: data.contactId,
            reason: 'Conversation is no longer open',
          });

          return;
        }
      }

      // 5. All checks passed — execute the follow-up actions
      for (const action of rule.actions) {
        if (action.actionType === 'SEND_MESSAGE') {
          const config = action.actionConfig as Record<string, unknown>;
          const idempotencyKey = `follow-up-${data.ruleId}-${data.contactId}-${Date.now()}`;

          await this.outboundMessage.send({
            orgId: data.orgId,
            sessionId: data.sessionId,
            conversationId: data.conversationId,
            contactPhone: data.contactPhone,
            body: String(config.messageBody ?? ''),
            idempotencyKey,
            metadata: { automationRuleId: data.ruleId, followUp: true },
          });
        }
      }

      // 6. Emit follow-up executed event
      this.eventEmitter.emit(EVENT_NAMES.FOLLOW_UP_EXECUTED, {
        ruleId: data.ruleId,
        orgId: data.orgId,
        contactId: data.contactId,
        messageId: `follow-up-${data.ruleId}-${data.contactId}`,
      });

      // 7. Increment execution count
      await this.automationRepo.incrementExecutionCount(data.ruleId);

      this.logger.log(
        `Follow-up executed: rule=${data.ruleId} contact=${data.contactId}`,
      );
    } catch (error) {
      this.logger.error(
        `Follow-up check failed: rule=${data.ruleId} contact=${data.contactId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error; // Let pg-boss handle retry
    }
  }
}
