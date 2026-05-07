import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationDispatchService } from '@/modules/notifications/domain/services/notification-dispatch.service';
import { SlaRepository } from '@/modules/sla/infrastructure/repositories/sla.repository';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { EVENT_NAMES, QUEUE_NAMES } from '@/common/constants';
import {
  SlaBreachDetectedEvent,
  SlaWarningTriggeredEvent,
  SlaBreachAcknowledgedEvent,
  SlaTrackingStartedEvent,
} from '@/events/event-bus';

@Injectable()
export class SlaEventsHandler {
  private readonly logger = new Logger(SlaEventsHandler.name);

  constructor(
    private readonly notificationService: NotificationDispatchService,
    private readonly slaRepo: SlaRepository,
    private readonly wsGateway: AppWebSocketGateway,
  ) {}

  /**
   * When an SLA breach is detected, send notifications to configured users
   * and push a real-time alert via WebSocket.
   */
  @OnEvent(EVENT_NAMES.SLA_BREACH_DETECTED)
  async handleBreachDetected(event: SlaBreachDetectedEvent): Promise<void> {
    try {
      const policy = await this.slaRepo.findPolicyById(
        event.policyId,
        event.orgId,
      );
      if (!policy) return;

      const policyName = policy.name;
      const thresholdMinutes = Math.round(event.thresholdMs / 60_000);
      const actualMinutes = Math.round(event.actualMs / 60_000);

      // Determine notification recipients
      const notifyUserIds = (policy.notifyUserIds as string[] | null) ?? [];

      // Also notify the assigned user if present
      if (event.assignedUserId && !notifyUserIds.includes(event.assignedUserId)) {
        notifyUserIds.push(event.assignedUserId);
      }

      if (notifyUserIds.length > 0) {
        await this.notificationService.dispatchToOrg(
          event.orgId,
          notifyUserIds,
          'SLA_BREACH',
          'HIGH',
          `SLA Breach: ${policyName}`,
          `Response time SLA "${policyName}" has been breached. Expected: ${thresholdMinutes}min, Actual: ${actualMinutes}min. Conversation requires immediate attention.`,
          {
            breachId: event.breachId,
            policyId: event.policyId,
            conversationId: event.conversationId,
            metricType: event.metricType,
            thresholdMs: event.thresholdMs,
            actualMs: event.actualMs,
          },
          `sla-breach:${event.breachId}`,
        );
      }

      // Push real-time WebSocket event to org
      this.wsGateway.emitToOrg(event.orgId, 'sla:breach', {
        breachId: event.breachId,
        policyId: event.policyId,
        policyName,
        conversationId: event.conversationId,
        assignedUserId: event.assignedUserId,
        metricType: event.metricType,
        thresholdMs: event.thresholdMs,
        actualMs: event.actualMs,
        createdAt: new Date().toISOString(),
      });

      this.logger.log(
        `SLA breach notification sent: breach=${event.breachId} policy="${policyName}" notified=${notifyUserIds.length} users`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle SLA breach notification: ${error}`,
      );
    }
  }

  /**
   * When an SLA warning is triggered, notify configured users.
   */
  @OnEvent(EVENT_NAMES.SLA_WARNING_TRIGGERED)
  async handleWarningTriggered(event: SlaWarningTriggeredEvent): Promise<void> {
    try {
      const policy = await this.slaRepo.findPolicyById(
        event.policyId,
        event.orgId,
      );
      if (!policy || !policy.notifyOnWarning) return;

      const policyName = policy.name;
      const thresholdMinutes = Math.round(event.thresholdMs / 60_000);
      const elapsedMinutes = Math.round(event.elapsedMs / 60_000);
      const remainingMinutes = thresholdMinutes - elapsedMinutes;

      const notifyUserIds = (policy.notifyUserIds as string[] | null) ?? [];
      if (event.assignedUserId && !notifyUserIds.includes(event.assignedUserId)) {
        notifyUserIds.push(event.assignedUserId);
      }

      if (notifyUserIds.length > 0) {
        await this.notificationService.dispatchToOrg(
          event.orgId,
          notifyUserIds,
          'SLA_BREACH',
          'NORMAL',
          `SLA Warning: ${policyName}`,
          `SLA "${policyName}" is approaching breach. ${remainingMinutes} minutes remaining. Please respond to the conversation promptly.`,
          {
            trackingId: event.trackingId,
            policyId: event.policyId,
            conversationId: event.conversationId,
            elapsedMs: event.elapsedMs,
            thresholdMs: event.thresholdMs,
            isWarning: true,
          },
          `sla-warning:${event.trackingId}`,
        );
      }

      // WebSocket push for real-time dashboard update
      this.wsGateway.emitToOrg(event.orgId, 'sla:warning', {
        trackingId: event.trackingId,
        policyId: event.policyId,
        policyName,
        conversationId: event.conversationId,
        assignedUserId: event.assignedUserId,
        elapsedMs: event.elapsedMs,
        thresholdMs: event.thresholdMs,
        warningThresholdMs: event.warningThresholdMs,
      });
    } catch (error) {
      this.logger.error(`Failed to handle SLA warning notification: ${error}`);
    }
  }

  /**
   * When an SLA tracking starts, push a real-time event.
   */
  @OnEvent(EVENT_NAMES.SLA_TRACKING_STARTED)
  async handleTrackingStarted(event: SlaTrackingStartedEvent): Promise<void> {
    this.wsGateway.emitToOrg(event.orgId, 'sla:tracking_started', {
      trackingId: event.trackingId,
      policyId: event.policyId,
      conversationId: event.conversationId,
      assignedUserId: event.assignedUserId,
      deadlineAt: event.deadlineAt,
    });
  }

  /**
   * When a breach is acknowledged, push a real-time event.
   */
  @OnEvent(EVENT_NAMES.SLA_BREACH_ACKNOWLEDGED)
  async handleBreachAcknowledged(event: SlaBreachAcknowledgedEvent): Promise<void> {
    this.wsGateway.emitToOrg(event.orgId, 'sla:breach_acknowledged', {
      breachId: event.breachId,
      acknowledgedById: event.acknowledgedById,
    });
  }
}
