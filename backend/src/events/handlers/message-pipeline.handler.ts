import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { MessagePipelineService } from '@/modules/messages/application/services/message-pipeline.service';

/**
 * Single event handler for incoming WhatsApp messages.
 *
 * Delegates to MessagePipelineService which runs chatbot first,
 * then automation — never both simultaneously.
 *
 * Replaces the old ChatbotTriggerHandler + duplicate
 * AutomationEventsHandler.handleMessageReceived() approach.
 */
@Injectable()
export class MessagePipelineHandler {
  private readonly logger = new Logger(MessagePipelineHandler.name);

  constructor(private readonly pipeline: MessagePipelineService) {}

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED)
  async handleIncomingMessage(payload: {
    messageId: string;
    orgId: string;
    conversationId: string;
    contactId: string;
    contactPhone: string;
    sessionId: string;
    body?: string;
    type?: string;
  }): Promise<void> {
    this.logger.debug(`Message pipeline triggered for message ${payload.messageId}`);
    await this.pipeline.processIncoming(payload);
  }
}
