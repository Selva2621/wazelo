import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepository } from '../../infrastructure/repositories/message.repository';
import { MessageEventRepository } from '../../infrastructure/repositories/message-event.repository';

@Injectable()
export class GetMessageUseCase {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly messageEventRepo: MessageEventRepository,
  ) {}

  async execute(messageId: string, orgId: string) {
    const message = await this.messageRepo.findByIdAndOrg(messageId, orgId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    return message;
  }

  async executeWithEvents(messageId: string, orgId: string) {
    const message = await this.messageRepo.findByIdAndOrg(messageId, orgId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const events = await this.messageEventRepo.findByMessageId(messageId);
    return { message, events };
  }
}
