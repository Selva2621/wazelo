import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { NotificationDispatchService } from '@/modules/notifications/domain/services/notification-dispatch.service';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import {
  WhatsAppMessageReceivedEvent,
  ContactAssignedEvent,
  ContactReassignedEvent,
  CampaignCompletedEvent,
  CampaignFailedEvent,
  AutomationExecutedEvent,
  AutomationFailedEvent,
  WhatsAppSessionDisconnectedEvent,
  PaymentFailedEvent,
  UsageLimitReachedEvent,
  UsageSoftLimitWarningEvent,
  SubscriptionGracePeriodEvent,
  AlertTriggeredEvent,
} from '@/events/event-bus';

/**
 * EPIC 11 — Notification Events Handler
 *
 * Listens to system events and dispatches user-facing notifications.
 * Each handler maps a domain event to a NotificationTarget and calls
 * the NotificationDispatchService which handles preferences, deduplication,
 * multi-channel delivery (in-app + email), and WebSocket push.
 */
@Injectable()
export class NotificationEventsHandler {
  private readonly logger = new Logger(NotificationEventsHandler.name);

  constructor(
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly userRepository: UserRepository,
  ) {}

  // ─── Message Events ───

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED)
  async handleMessageReceived(event: WhatsAppMessageReceivedEvent): Promise<void> {
    try {
      await this.notificationDispatch.dispatch({
        orgId: event.orgId,
        userId: event.userId,
        type: 'MESSAGE_RECEIVED',
        priority: 'NORMAL',
        title: 'New message received',
        body: `New ${event.type} message from ${event.contactPhone}`,
        data: {
          messageId: event.messageId,
          conversationId: event.conversationId,
          contactPhone: event.contactPhone,
        },
        groupKey: `msg:${event.conversationId}`,
        idempotencyKey: `msg-received:${event.messageId}`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to dispatch MESSAGE_RECEIVED notification: ${error}`,
      );
    }
  }

  // ─── Contact Events ───

  @OnEvent(EVENT_NAMES.CONTACT_ASSIGNED)
  async handleContactAssigned(event: ContactAssignedEvent): Promise<void> {
    try {
      await this.notificationDispatch.dispatch({
        orgId: event.orgId,
        userId: event.ownerId,
        type: 'CONTACT_ASSIGNED',
        priority: 'NORMAL',
        title: 'Contact assigned to you',
        body: `A contact has been assigned to you`,
        data: {
          contactId: event.contactId,
          assignedById: event.assignedById,
        },
        idempotencyKey: `contact-assigned:${event.contactId}:${event.ownerId}`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to dispatch CONTACT_ASSIGNED notification: ${error}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.CONTACT_REASSIGNED)
  async handleContactReassigned(event: ContactReassignedEvent): Promise<void> {
    try {
      // Notify the new owner
      await this.notificationDispatch.dispatch({
        orgId: event.orgId,
        userId: event.newOwnerId,
        type: 'CONTACT_REASSIGNED',
        priority: 'NORMAL',
        title: 'Contact reassigned to you',
        body: `A contact has been reassigned to you`,
        data: {
          contactId: event.contactId,
          previousOwnerId: event.previousOwnerId,
          reassignedById: event.reassignedById,
        },
        idempotencyKey: `contact-reassigned:${event.contactId}:${event.newOwnerId}:${Date.now()}`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to dispatch CONTACT_REASSIGNED notification: ${error}`,
      );
    }
  }

  // ─── Campaign Events ───

  @OnEvent(EVENT_NAMES.CAMPAIGN_COMPLETED)
  async handleCampaignCompleted(event: CampaignCompletedEvent): Promise<void> {
    try {
      const admins = await this.getOrgAdminsAndManagers(event.orgId);
      await this.notificationDispatch.dispatchToOrg(
        event.orgId,
        admins,
        'CAMPAIGN_COMPLETED',
        'NORMAL',
        'Campaign completed',
        `Campaign finished: ${event.sentCount} sent, ${event.failedCount} failed out of ${event.totalRecipients}`,
        {
          campaignId: event.campaignId,
          totalRecipients: event.totalRecipients,
          sentCount: event.sentCount,
          failedCount: event.failedCount,
        },
        `campaign-completed:${event.campaignId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to dispatch CAMPAIGN_COMPLETED notification: ${error}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.CAMPAIGN_FAILED)
  async handleCampaignFailed(event: CampaignFailedEvent): Promise<void> {
    try {
      const admins = await this.getOrgAdminsAndManagers(event.orgId);
      await this.notificationDispatch.dispatchToOrg(
        event.orgId,
        admins,
        'CAMPAIGN_FAILED',
        'HIGH',
        'Campaign failed',
        `Campaign failed: ${event.reason}`,
        {
          campaignId: event.campaignId,
          reason: event.reason,
        },
        `campaign-failed:${event.campaignId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to dispatch CAMPAIGN_FAILED notification: ${error}`,
      );
    }
  }

  // ─── Automation Events ───

  @OnEvent(EVENT_NAMES.AUTOMATION_EXECUTED)
  async handleAutomationExecuted(event: AutomationExecutedEvent): Promise<void> {
    try {
      // Only notify if execution took too long (potential issue indicator)
      if (event.executionTimeMs > 10_000) {
        const admins = await this.getOrgAdminsAndManagers(event.orgId);
        await this.notificationDispatch.dispatchToOrg(
          event.orgId,
          admins,
          'AUTOMATION_EXECUTED',
          'LOW',
          'Slow automation execution',
          `Automation rule took ${Math.round(event.executionTimeMs / 1000)}s to execute`,
          {
            executionId: event.executionId,
            ruleId: event.ruleId,
            executionTimeMs: event.executionTimeMs,
          },
          `automation-slow:${event.executionId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to dispatch AUTOMATION_EXECUTED notification: ${error}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.AUTOMATION_FAILED)
  async handleAutomationFailed(event: AutomationFailedEvent): Promise<void> {
    try {
      const admins = await this.getOrgAdminsAndManagers(event.orgId);
      await this.notificationDispatch.dispatchToOrg(
        event.orgId,
        admins,
        'AUTOMATION_FAILED',
        'HIGH',
        'Automation rule failed',
        `Automation failed: ${event.error}`,
        {
          executionId: event.executionId,
          ruleId: event.ruleId,
          error: event.error,
          retryCount: event.retryCount,
        },
        `automation-failed:${event.executionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to dispatch AUTOMATION_FAILED notification: ${error}`,
      );
    }
  }

  // ─── Critical Alerts (Admin-only) ───

  @OnEvent(EVENT_NAMES.WHATSAPP_SESSION_DISCONNECTED)
  async handleSessionDisconnected(
    event: WhatsAppSessionDisconnectedEvent,
  ): Promise<void> {
    try {
      const admins = await this.getOrgAdminsAndManagers(event.orgId);
      // Also notify the session owner
      const targetUsers = [...new Set([...admins, event.userId])];

      await this.notificationDispatch.dispatchToOrg(
        event.orgId,
        targetUsers,
        'WHATSAPP_SESSION_DISCONNECTED',
        'CRITICAL',
        'WhatsApp session disconnected',
        `WhatsApp session disconnected: ${event.reason}`,
        {
          sessionId: event.sessionId,
          reason: event.reason,
        },
        `wa-disconnected:${event.sessionId}:${Date.now()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to dispatch SESSION_DISCONNECTED notification: ${error}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.PAYMENT_FAILED)
  async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    try {
      const admins = await this.getOrgAdmins(event.orgId);
      await this.notificationDispatch.dispatchToOrg(
        event.orgId,
        admins,
        'PAYMENT_FAILED',
        'CRITICAL',
        'Payment failed',
        `Payment failed: ${event.reason}. Retry ${event.retryCount} scheduled.`,
        {
          paymentId: event.paymentId,
          subscriptionId: event.subscriptionId,
          reason: event.reason,
          retryCount: event.retryCount,
        },
        `payment-failed:${event.paymentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to dispatch PAYMENT_FAILED notification: ${error}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.USAGE_SOFT_LIMIT_WARNING)
  async handleUsageSoftLimitWarning(
    event: UsageSoftLimitWarningEvent,
  ): Promise<void> {
    try {
      const admins = await this.getOrgAdmins(event.orgId);
      await this.notificationDispatch.dispatchToOrg(
        event.orgId,
        admins,
        'USAGE_LIMIT_WARNING',
        'HIGH',
        'Usage limit approaching',
        `${event.metricType} is at ${event.percentUsed}% of your plan limit`,
        {
          metricType: event.metricType,
          currentValue: event.currentValue,
          limitValue: event.limitValue,
          percentUsed: event.percentUsed,
        },
        `usage-warning:${event.orgId}:${event.metricType}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to dispatch USAGE_SOFT_LIMIT notification: ${error}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.USAGE_LIMIT_REACHED)
  async handleUsageLimitReached(event: UsageLimitReachedEvent): Promise<void> {
    try {
      const admins = await this.getOrgAdmins(event.orgId);
      await this.notificationDispatch.dispatchToOrg(
        event.orgId,
        admins,
        'USAGE_LIMIT_REACHED',
        'CRITICAL',
        'Usage limit reached',
        `${event.metricType} has reached its limit (${event.currentValue}/${event.limitValue})`,
        {
          metricType: event.metricType,
          currentValue: event.currentValue,
          limitValue: event.limitValue,
        },
        `usage-reached:${event.orgId}:${event.metricType}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to dispatch USAGE_LIMIT_REACHED notification: ${error}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.SUBSCRIPTION_GRACE_PERIOD)
  async handleSubscriptionGracePeriod(
    event: SubscriptionGracePeriodEvent,
  ): Promise<void> {
    try {
      const admins = await this.getOrgAdmins(event.orgId);
      await this.notificationDispatch.dispatchToOrg(
        event.orgId,
        admins,
        'SUBSCRIPTION_EXPIRING',
        'CRITICAL',
        'Subscription expiring soon',
        `Your subscription enters grace period. Service will be suspended on ${event.graceEndsAt}`,
        {
          subscriptionId: event.subscriptionId,
          graceEndsAt: event.graceEndsAt,
        },
        `sub-grace:${event.subscriptionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to dispatch SUBSCRIPTION_GRACE notification: ${error}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.ALERT_TRIGGERED)
  async handleSystemAlert(event: AlertTriggeredEvent): Promise<void> {
    try {
      // System alerts go to all orgs' admins — but AlertTriggeredEvent
      // doesn't carry an orgId (it's system-wide). Log it instead.
      this.logger.warn(
        `System alert triggered: ${event.ruleName} — ${event.message}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle ALERT_TRIGGERED: ${error}`,
      );
    }
  }

  // ─── Helpers ───

  private async getOrgAdmins(orgId: string): Promise<string[]> {
    const users = await this.userRepository.findByOrgId(orgId);
    return users
      .filter((u) => u.role === 'ADMIN' && !u.deletedAt)
      .map((u) => u.id);
  }

  private async getOrgAdminsAndManagers(orgId: string): Promise<string[]> {
    const users = await this.userRepository.findByOrgId(orgId);
    return users
      .filter(
        (u) =>
          (u.role === 'ADMIN' || u.role === 'MANAGER') && !u.deletedAt,
      )
      .map((u) => u.id);
  }
}
