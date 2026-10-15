import { Injectable, OnModuleInit } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { MessageRepository } from './repositories/message.repository';

/**
 * Gives Baileys a way to fetch the text of a message we sent, so it can
 * re-send it when the recipient's phone fails to decrypt it.
 */
@Injectable()
export class BaileysSentMessageLookup implements OnModuleInit {
  constructor(
    private readonly connectionManager: BaileysConnectionManager,
    private readonly messageRepo: MessageRepository,
  ) {}

  onModuleInit(): void {
    this.connectionManager.registerSentMessageLookup(async (whatsappMessageId) => {
      const message = await this.messageRepo.findByWhatsAppMessageId(whatsappMessageId);
      // Only text can be rebuilt from what we store; a media message would be
      // re-sent as its caption, so let that retry fail instead
      if (message?.type !== MessageType.TEXT) return undefined;
      return message.body ?? undefined;
    });
  }
}
