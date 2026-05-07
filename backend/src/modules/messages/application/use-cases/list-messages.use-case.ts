import { Injectable, BadRequestException } from '@nestjs/common';
import { MessageRepository } from '../../infrastructure/repositories/message.repository';
import { ListMessagesQueryDto } from '../dto';

@Injectable()
export class ListMessagesUseCase {
  constructor(private readonly messageRepo: MessageRepository) {}

  async execute(orgId: string, query: ListMessagesQueryDto) {
    if (query.conversationId) {
      return this.messageRepo.findByConversation(query.conversationId, orgId, {
        page: query.page,
        limit: query.limit,
        before: query.before,
      });
    }

    if (query.sessionId) {
      return this.messageRepo.findBySessionPaginated(query.sessionId, orgId, {
        page: query.page,
        limit: query.limit,
      });
    }

    if (query.contactPhone) {
      return this.messageRepo.findByContactPaginated(orgId, query.contactPhone, {
        page: query.page,
        limit: query.limit,
      });
    }

    throw new BadRequestException(
      'At least one filter is required: conversationId, sessionId, or contactPhone',
    );
  }
}
