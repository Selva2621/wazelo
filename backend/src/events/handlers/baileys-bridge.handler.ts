import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { HandleSessionEventUseCase } from '@/modules/whatsapp/application/use-cases/handle-session-event.use-case';
import { HandleIncomingMessageUseCase } from '@/modules/whatsapp/application/use-cases/handle-incoming-message.use-case';
import { HandleStatusUpdateUseCase } from '@/modules/whatsapp/application/use-cases/handle-status-update.use-case';
import { EVENT_NAMES } from '@/common/constants';

@Injectable()
export class BaileysBridgeHandler {
  private readonly logger = new Logger(BaileysBridgeHandler.name);

  constructor(
    private readonly handleSessionEvent: HandleSessionEventUseCase,
    private readonly handleIncomingMessage: HandleIncomingMessageUseCase,
    private readonly handleStatusUpdate: HandleStatusUpdateUseCase,
  ) {}

  @OnEvent(EVENT_NAMES.BAILEYS_CONNECTION_UPDATE)
  async onConnectionUpdate(payload: {
    sessionId: string;
    orgId: string;
    userId: string;
    event: 'connected' | 'disconnected' | 'logout';
    phoneNumber?: string;
    reason?: string;
  }): Promise<void> {
    try {
      await this.handleSessionEvent.execute(payload);
    } catch (error) {
      this.logger.error(
        `Error handling connection update for session ${payload.sessionId}`,
        error,
      );
    }
  }

  @OnEvent(EVENT_NAMES.BAILEYS_MESSAGE_UPSERT)
  async onMessageUpsert(payload: {
    sessionId: string;
    whatsappMessageId: string;
    contactPhone: string;
    contactName?: string;
    type: string;
    body?: string;
    mediaUrl?: string;
    mediaMimeType?: string;
    mediaSize?: number;
    timestamp: number;
  }): Promise<void> {
    try {
      await this.handleIncomingMessage.execute(payload);
    } catch (error) {
      this.logger.error(
        `Error handling incoming message ${payload.whatsappMessageId}`,
        error,
      );
    }
  }

  @OnEvent(EVENT_NAMES.BAILEYS_MESSAGE_UPDATE)
  async onMessageUpdate(payload: {
    whatsappMessageId: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: number;
    errorCode?: number;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.handleStatusUpdate.execute(payload);
    } catch (error) {
      this.logger.error(
        `Error handling status update for ${payload.whatsappMessageId}`,
        error,
      );
    }
  }
}
