import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationRepository } from '../../infrastructure/repositories/conversation.repository';

@Injectable()
export class MarkConversationReadUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  async execute(conversationId: string, orgId: string) {
    const conversation = await this.conversationRepo.findByIdAndOrg(conversationId, orgId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.conversationRepo.markRead(conversationId);
  }
}
