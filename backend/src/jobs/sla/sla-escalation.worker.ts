import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { NotificationDispatchService } from '@/modules/notifications/domain/services/notification-dispatch.service';
import { SlaRepository } from '@/modules/sla/infrastructure/repositories/sla.repository';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';
import { SlaEscalationTriggeredEvent } from '@/events/event-bus';

interface SlaEscalationJobData {
  breachId: string;
  orgId: string;
  policyId: string;
  conversationId: string;
  escalationLevel: number;
  notifyUserIds: string[];
}

@Injectable()
export class SlaEscalationWorker implements OnModuleInit {
  private readonly logger = new Logger(SlaEscalationWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly slaRepo: SlaRepository,
    private readonly notificationService: NotificationDispatchService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<SlaEscalationJobData>(
      QUEUE_NAMES.SLA_ESCALATION,
      async (job) => this.handle(job.data),
    );
    this.logger.log('SlaEscalationWorker subscribed');
  }

  private async handle(data: SlaEscalationJobData): Promise<void> {
    // Check if breach is still active (may have been acknowledged/resolved)
    const breach = await this.slaRepo.findBreachById(data.breachId, data.orgId);
    if (!breach || breach.status !== 'ACTIVE') {
      this.logger.debug(
        `Skipping escalation: breach=${data.breachId} is no longer active`,
      );
      return;
    }

    // Load policy for name
    const policy = await this.slaRepo.findPolicyById(data.policyId, data.orgId);
    const policyName = policy?.name ?? 'Unknown Policy';

    // Dispatch escalation notifications
    await this.notificationService.dispatchToOrg(
      data.orgId,
      data.notifyUserIds,
      'SLA_BREACH',
      'CRITICAL',
      `SLA Escalation (Level ${data.escalationLevel}): ${policyName}`,
      `SLA breach for conversation has been escalated to level ${data.escalationLevel}. Policy "${policyName}" threshold exceeded. Immediate attention required.`,
      {
        breachId: data.breachId,
        policyId: data.policyId,
        conversationId: data.conversationId,
        escalationLevel: data.escalationLevel,
      },
      `sla-escalation:${data.breachId}:level-${data.escalationLevel}`,
    );

    // Emit escalation event
    this.eventEmitter.emit(EVENT_NAMES.SLA_ESCALATION_TRIGGERED, {
      breachId: data.breachId,
      orgId: data.orgId,
      policyId: data.policyId,
      conversationId: data.conversationId,
      escalationLevel: data.escalationLevel,
      notifyUserIds: data.notifyUserIds,
    } satisfies SlaEscalationTriggeredEvent);

    this.logger.log(
      `SLA escalation triggered: breach=${data.breachId} level=${data.escalationLevel} notified=${data.notifyUserIds.length} users`,
    );
  }
}
