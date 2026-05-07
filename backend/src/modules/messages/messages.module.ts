import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { WhatsAppModule } from '@/modules/whatsapp/whatsapp.module';
import { TeamsModule } from '@/modules/teams/teams.module';
import { UsersModule } from '@/modules/users/users.module';
import { ChannelsModule } from '@/modules/channels/channels.module';
import { AiModule } from '@/modules/ai/ai.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { EncryptionService } from '@/common/services';

// Repositories
import { MessageRepository } from './infrastructure/repositories/message.repository';
import { ConversationRepository } from './infrastructure/repositories/conversation.repository';
import { MessageEventRepository } from './infrastructure/repositories/message-event.repository';
import { DeadLetterRepository } from './infrastructure/repositories/dead-letter.repository';
import { CannedResponseRepository } from './infrastructure/repositories/canned-response.repository';
import { TemplateRepository } from './infrastructure/repositories/template.repository';

// Domain services
import { RateLimiterService } from './domain/services/rate-limiter.service';
import { MessageEncryptionService } from './domain/services/message-encryption.service';

// Use cases
import {
  SendMessageUseCase,
  GetMessageUseCase,
  ListMessagesUseCase,
  ListConversationsUseCase,
  MarkConversationReadUseCase,
  ListDeadLettersUseCase,
  ReprocessDeadLetterUseCase,
} from './application/use-cases';
import { DeleteConversationUseCase } from './application/use-cases/delete-conversation.use-case';
import { CloseConversationUseCase } from './application/use-cases/close-conversation.use-case';
import { AssignConversationUseCase } from './application/use-cases/assign-conversation.use-case';
import { SyncTemplatesUseCase } from './application/use-cases/sync-templates.use-case';
import { SendTemplateMessageUseCase } from './application/use-cases/send-template-message.use-case';
import { GenerateTemplateUseCase } from './application/use-cases/generate-template.use-case';
import { OutboundMessageService } from './application/services/outbound-message.service';

// Controllers
import { MessagesController } from './interfaces/controllers/messages.controller';
import { CannedResponsesController } from './interfaces/controllers/canned-responses.controller';
import { TemplatesController } from './interfaces/controllers/templates.controller';

@Module({
  imports: [AuditModule, forwardRef(() => WhatsAppModule), forwardRef(() => TeamsModule), forwardRef(() => UsersModule), ChannelsModule, AiModule, BillingModule],
  controllers: [MessagesController, CannedResponsesController, TemplatesController],
  providers: [
    // Repositories
    MessageRepository,
    ConversationRepository,
    MessageEventRepository,
    DeadLetterRepository,

    // Domain services
    EncryptionService,
    MessageEncryptionService,
    RateLimiterService,

    // Use cases
    SendMessageUseCase,
    GetMessageUseCase,
    ListMessagesUseCase,
    ListConversationsUseCase,
    MarkConversationReadUseCase,
    ListDeadLettersUseCase,
    ReprocessDeadLetterUseCase,
    DeleteConversationUseCase,
    CloseConversationUseCase,
    AssignConversationUseCase,
    CannedResponseRepository,
    TemplateRepository,
    SyncTemplatesUseCase,
    SendTemplateMessageUseCase,
    GenerateTemplateUseCase,
    OutboundMessageService,
  ],
  exports: [
    MessageRepository,
    ConversationRepository,
    MessageEventRepository,
    DeadLetterRepository,
    RateLimiterService,
    MessageEncryptionService,
    OutboundMessageService,
  ],
})
export class MessagesModule {}
