import { Injectable, Logger } from '@nestjs/common';
import { AutomationTriggerType } from '@prisma/client';

export interface TriggerMatchInput {
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown>;
  eventPayload: Record<string, unknown>;
}

@Injectable()
export class TriggerMatcherService {
  private readonly logger = new Logger(TriggerMatcherService.name);

  matches(input: TriggerMatchInput): boolean {
    switch (input.triggerType) {
      case AutomationTriggerType.MESSAGE_RECEIVED:
        return this.matchMessageReceived(input.triggerConfig, input.eventPayload);

      case AutomationTriggerType.CONTACT_CREATED:
        return this.matchContactCreated(input.triggerConfig, input.eventPayload);

      case AutomationTriggerType.LEAD_STATUS_CHANGED:
        return this.matchLeadStatusChanged(input.triggerConfig, input.eventPayload);

      case AutomationTriggerType.TIME_BASED:
        // Time-based triggers are evaluated by the scheduler worker, not event-driven
        return false;

      case AutomationTriggerType.NO_REPLY:
        // No-reply triggers are evaluated by the follow-up worker
        return false;

      case AutomationTriggerType.SHOPIFY_ORDER_CREATED:
        return this.matchShopifyOrder(input.triggerConfig, input.eventPayload);

      case AutomationTriggerType.SHOPIFY_ORDER_FULFILLED:
        return this.matchShopifyOrder(input.triggerConfig, input.eventPayload);

      case AutomationTriggerType.SHOPIFY_CART_ABANDONED:
        // All abandoned carts match unless a minimum cart value is configured
        return this.matchAbandonedCart(input.triggerConfig, input.eventPayload);

      case AutomationTriggerType.WIDGET_MESSAGE_RECEIVED:
        return this.matchWidgetMessage(input.triggerConfig, input.eventPayload);

      default:
        this.logger.warn(`Unknown trigger type: ${input.triggerType}`);
        return false;
    }
  }

  private matchMessageReceived(
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): boolean {
    const keyword = config.messageKeyword as string | undefined;

    if (!keyword) {
      // No keyword filter — match all incoming messages
      return true;
    }

    const messageBody = payload.body as string | undefined;
    if (!messageBody) return false;

    return messageBody.toLowerCase().includes(keyword.toLowerCase());
  }

  private matchContactCreated(
    config: Record<string, unknown>,
    _payload: Record<string, unknown>,
  ): boolean {
    // Contact created triggers match all new contacts
    // Conditions handle further filtering (by source, tags, etc.)
    const source = config.source as string | undefined;
    if (source && _payload.source !== source) {
      return false;
    }
    return true;
  }

  private matchLeadStatusChanged(
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): boolean {
    const fromStatus = config.fromStatus as string | undefined;
    const toStatus = config.toStatus as string | undefined;

    if (fromStatus && payload.previousStatus !== fromStatus) {
      return false;
    }

    if (toStatus && payload.newStatus !== toStatus) {
      return false;
    }

    return true;
  }

  private matchShopifyOrder(
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): boolean {
    // Optional: filter by minimum order value
    const minOrderValue = config.minOrderValue as number | undefined;
    if (minOrderValue !== undefined) {
      const totalPrice = parseFloat(payload.totalPrice as string ?? '0');
      if (totalPrice < minOrderValue) return false;
    }
    return true;
  }

  private matchWidgetMessage(
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): boolean {
    const keyword = config.messageKeyword as string | undefined;
    if (!keyword) return true; // No filter — match all widget messages
    const body = payload.body as string | undefined;
    if (!body) return false;
    return body.toLowerCase().includes(keyword.toLowerCase());
  }

  private matchAbandonedCart(
    config: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): boolean {
    // Optional: filter by minimum cart value
    const minCartValue = config.minCartValue as number | undefined;
    if (minCartValue !== undefined) {
      const cartTotal = parseFloat(payload.cartTotal as string ?? '0');
      if (cartTotal < minCartValue) return false;
    }
    return true;
  }
}
