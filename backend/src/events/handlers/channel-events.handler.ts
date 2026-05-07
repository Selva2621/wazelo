import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { EVENT_NAMES } from '@/common/constants';
import {
  ChannelCreatedEvent,
  ChannelSuspendedEvent,
  ChannelDeletedEvent,
  ChannelMessageSentEvent,
  ChannelMessageReceivedEvent,
  ChannelMessageDeliveredEvent,
  ChannelMessageReadEvent,
  ChannelMessageFailedEvent,
} from '../event-bus';
import type { ConversationAssignedEvent } from '@/modules/messages/application/use-cases/assign-conversation.use-case';

@Injectable()
export class ChannelEventsHandler {
  private readonly logger = new Logger(ChannelEventsHandler.name);

  constructor(private readonly wsGateway: AppWebSocketGateway) {}

  @OnEvent(EVENT_NAMES.CHANNEL_CREATED)
  handleChannelCreated(event: ChannelCreatedEvent) {
    this.wsGateway.emitToOrg(event.orgId, 'channel:created', {
      channelId: event.channelId,
      channelType: event.channelType,
    });
  }

  @OnEvent(EVENT_NAMES.CHANNEL_SUSPENDED)
  handleChannelSuspended(event: ChannelSuspendedEvent) {
    this.wsGateway.emitToOrg(event.orgId, 'channel:suspended', {
      channelId: event.channelId,
      channelType: event.channelType,
      reason: event.reason,
    });
  }

  @OnEvent(EVENT_NAMES.CHANNEL_DELETED)
  handleChannelDeleted(event: ChannelDeletedEvent) {
    this.wsGateway.emitToOrg(event.orgId, 'channel:deleted', {
      channelId: event.channelId,
      channelType: event.channelType,
    });
  }

  @OnEvent(EVENT_NAMES.CHANNEL_MESSAGE_SENT)
  handleMessageSent(event: ChannelMessageSentEvent) {
    this.wsGateway.emitToOrg(event.orgId, 'channel:message:sent', {
      messageId: event.messageId,
      channelId: event.channelId,
      channelType: event.channelType,
      conversationId: event.conversationId,
      externalMessageId: event.externalMessageId,
    });
  }

  @OnEvent(EVENT_NAMES.CHANNEL_MESSAGE_RECEIVED)
  handleMessageReceived(event: ChannelMessageReceivedEvent) {
    this.wsGateway.emitToOrg(
      event.orgId,
      'channel:message:received',
      {
        messageId: event.messageId,
        channelId: event.channelId,
        channelType: event.channelType,
        conversationId: event.conversationId,
        senderIdentifier: event.senderIdentifier,
        senderName: event.senderName,
      },
    );
  }

  @OnEvent(EVENT_NAMES.CHANNEL_MESSAGE_DELIVERED)
  handleMessageDelivered(event: ChannelMessageDeliveredEvent) {
    this.wsGateway.emitToOrg(
      event.orgId,
      'channel:message:delivered',
      {
        messageId: event.messageId,
        channelId: event.channelId,
        conversationId: event.conversationId,
        externalMessageId: event.externalMessageId,
      },
    );
  }

  @OnEvent(EVENT_NAMES.CHANNEL_MESSAGE_READ)
  handleMessageRead(event: ChannelMessageReadEvent) {
    this.wsGateway.emitToOrg(event.orgId, 'channel:message:read', {
      messageId: event.messageId,
      channelId: event.channelId,
      conversationId: event.conversationId,
      externalMessageId: event.externalMessageId,
    });
  }

  @OnEvent(EVENT_NAMES.CHANNEL_MESSAGE_FAILED)
  handleMessageFailed(event: ChannelMessageFailedEvent) {
    this.wsGateway.emitToOrg(
      event.orgId,
      'channel:message:failed',
      {
        messageId: event.messageId,
        channelId: event.channelId,
        error: event.error,
      },
    );
  }

  @OnEvent(EVENT_NAMES.CONVERSATION_ASSIGNED)
  handleConversationAssigned(event: ConversationAssignedEvent) {
    this.wsGateway.emitToOrg(event.orgId, 'conversation:assigned', {
      conversationId: event.conversationId,
      assignedToId: event.assignedToId,
      assignedById: event.assignedById,
    });
  }
}
