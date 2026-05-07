import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '@prisma/client';
import { ConversationRepository } from '../../infrastructure/repositories/conversation.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';

@Injectable()
export class DeleteConversationUseCase {
  private readonly logger = new Logger(DeleteConversationUseCase.name);

  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    conversationId: string,
    orgId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const conversation = await this.conversationRepo.findByIdAndOrg(conversationId, orgId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.conversationRepo.softDelete(conversationId);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_DELETED,
      targetType: 'Conversation',
      targetId: conversationId,
      metadata: {
        contactPhone: conversation.contactPhone,
        sessionId: conversation.sessionId,
      },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.CONVERSATION_UPDATED, {
      orgId,
      conversationId,
      action: 'deleted',
    });

    this.logger.log(`Conversation ${conversationId} soft-deleted by user ${userId}`);

    return { success: true };
  }
}
