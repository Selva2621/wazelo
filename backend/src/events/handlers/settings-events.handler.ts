import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { ManageWebhooksUseCase } from '@/modules/settings/application/use-cases/manage-webhooks.use-case';
import {
  ContactCreatedEvent,
  ContactUpdatedEvent,
  CampaignCompletedEvent,
  CampaignFailedEvent,
  WhatsAppMessageReceivedEvent,
  WhatsAppMessageSentEvent,
  WhatsAppMessageDeliveredEvent,
  WhatsAppMessageFailedEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
  SubscriptionUpgradedEvent,
  SubscriptionCancelledEvent,
  SubscriptionDowngradeAppliedEvent,
} from '../event-bus';

/**
 * EPIC 12 — Settings Events Handler
 *
 * Listens to domain events and dispatches them to org-registered webhooks.
 * Only fires for events that match webhook subscriptions.
 */
@Injectable()
export class SettingsEventsHandler {
  private readonly logger = new Logger(SettingsEventsHandler.name);

  constructor(private readonly manageWebhooks: ManageWebhooksUseCase) {}

  // ─── Message Events → Webhook ───

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED)
  async onMessageReceived(event: WhatsAppMessageReceivedEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'MESSAGE_RECEIVED', {
      messageId: event.messageId,
      sessionId: event.sessionId,
      contactPhone: event.contactPhone,
      type: event.type,
      conversationId: event.conversationId,
    });
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_SENT)
  async onMessageSent(event: WhatsAppMessageSentEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'MESSAGE_SENT', {
      messageId: event.messageId,
      sessionId: event.sessionId,
      contactPhone: event.contactPhone,
      whatsappMessageId: event.whatsappMessageId,
    });
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_DELIVERED)
  async onMessageDelivered(event: WhatsAppMessageDeliveredEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'MESSAGE_DELIVERED', {
      messageId: event.messageId,
      whatsappMessageId: event.whatsappMessageId,
    });
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_FAILED)
  async onMessageFailed(event: WhatsAppMessageFailedEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'MESSAGE_FAILED', {
      messageId: event.messageId,
      sessionId: event.sessionId,
      reason: event.reason,
      retryCount: event.retryCount,
    });
  }

  // ─── Contact Events → Webhook ───

  @OnEvent(EVENT_NAMES.CONTACT_CREATED)
  async onContactCreated(event: ContactCreatedEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'CONTACT_CREATED', {
      contactId: event.contactId,
      phoneNumber: event.phoneNumber,
      source: event.source,
    });
  }

  @OnEvent(EVENT_NAMES.CONTACT_UPDATED)
  async onContactUpdated(event: ContactUpdatedEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'CONTACT_UPDATED', {
      contactId: event.contactId,
      changes: event.changes,
    });
  }

  // ─── Campaign Events → Webhook ───

  @OnEvent(EVENT_NAMES.CAMPAIGN_COMPLETED)
  async onCampaignCompleted(event: CampaignCompletedEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'CAMPAIGN_COMPLETED', {
      campaignId: event.campaignId,
      totalRecipients: event.totalRecipients,
      sentCount: event.sentCount,
      failedCount: event.failedCount,
    });
  }

  @OnEvent(EVENT_NAMES.CAMPAIGN_FAILED)
  async onCampaignFailed(event: CampaignFailedEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'CAMPAIGN_FAILED', {
      campaignId: event.campaignId,
      reason: event.reason,
    });
  }

  // ─── Billing Events → Webhook ───

  @OnEvent(EVENT_NAMES.PAYMENT_SUCCEEDED)
  async onPaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'PAYMENT_SUCCEEDED', {
      paymentId: event.paymentId,
      subscriptionId: event.subscriptionId,
      amountInCents: event.amountInCents,
    });
  }

  @OnEvent(EVENT_NAMES.PAYMENT_FAILED)
  async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'PAYMENT_FAILED', {
      paymentId: event.paymentId,
      subscriptionId: event.subscriptionId,
      reason: event.reason,
      retryCount: event.retryCount,
    });
  }

  @OnEvent(EVENT_NAMES.SUBSCRIPTION_UPGRADED)
  async onSubscriptionUpgraded(event: SubscriptionUpgradedEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'SUBSCRIPTION_CHANGED', {
      subscriptionId: event.subscriptionId,
      action: 'upgraded',
      previousPlanId: event.previousPlanId,
      newPlanId: event.newPlanId,
    });
  }

  @OnEvent(EVENT_NAMES.SUBSCRIPTION_CANCELLED)
  async onSubscriptionCancelled(event: SubscriptionCancelledEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'SUBSCRIPTION_CHANGED', {
      subscriptionId: event.subscriptionId,
      action: 'cancelled',
      reason: event.reason,
    });
  }

  @OnEvent(EVENT_NAMES.SUBSCRIPTION_DOWNGRADE_APPLIED)
  async onSubscriptionDowngraded(event: SubscriptionDowngradeAppliedEvent): Promise<void> {
    await this.dispatchSafe(event.orgId, 'SUBSCRIPTION_CHANGED', {
      subscriptionId: event.subscriptionId,
      action: 'downgraded',
      previousPlanId: event.previousPlanId,
      newPlanId: event.newPlanId,
    });
  }

  /**
   * Fire-and-forget webhook dispatch. Never throws — errors are logged.
   */
  private async dispatchSafe(
    orgId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.manageWebhooks.dispatch(orgId, eventType, payload);
    } catch (error) {
      this.logger.error(
        `Failed to dispatch webhook for event ${eventType} in org ${orgId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
