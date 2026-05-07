import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { EVENT_NAMES } from '@/common/constants';
import type {
  LeadAdReceivedEvent,
  LeadAdFailedEvent,
} from '../event-bus';

@Injectable()
export class LeadAdEventsHandler {
  private readonly logger = new Logger(LeadAdEventsHandler.name);

  constructor(private readonly wsGateway: AppWebSocketGateway) {}

  @OnEvent(EVENT_NAMES.LEAD_AD_RECEIVED)
  handleLeadAdReceived(event: LeadAdReceivedEvent) {
    this.wsGateway.emitToOrg(event.orgId, 'lead_ad:received', {
      leadAdEntryId: event.leadAdEntryId,
      contactId: event.contactId,
      contactName: event.contactName,
      contactPhone: event.contactPhone,
      platform: event.platform,
      campaignName: event.campaignName,
      adName: event.adName,
    });

    this.logger.log(
      `Lead ad received: ${event.leadgenId} (${event.platform}) → Contact ${event.contactId}`,
    );
  }

  @OnEvent(EVENT_NAMES.LEAD_AD_FAILED)
  handleLeadAdFailed(event: LeadAdFailedEvent) {
    this.wsGateway.emitToOrg(event.orgId, 'lead_ad:failed', {
      leadAdEntryId: event.leadAdEntryId,
      leadgenId: event.leadgenId,
      error: event.error,
      retryCount: event.retryCount,
    });

    this.logger.warn(
      `Lead ad failed: ${event.leadgenId} — ${event.error} (retry: ${event.retryCount})`,
    );
  }
}
