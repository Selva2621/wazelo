import { Module } from '@nestjs/common';
import { AiModule } from '@/modules/ai/ai.module';
import { KnowledgeBaseModule } from '@/modules/knowledge-base/knowledge-base.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { EncryptionService } from '@/common/services';
import { ChatbotRepository } from './infrastructure/repositories/chatbot.repository';
import { ChatbotController } from './interfaces/controllers/chatbot.controller';
import { ExecuteChatbotFlowUseCase } from './application/use-cases/execute-chatbot-flow.use-case';
import { SimulateChatbotFlowUseCase } from './application/use-cases/simulate-chatbot-flow.use-case';
import { BotBehaviorRepository } from './infrastructure/repositories/bot-behavior.repository';
import { BotBehaviorService } from './application/services/bot-behavior.service';
import { GetBotInsightsUseCase } from './application/use-cases/get-bot-insights.use-case';

@Module({
  // AuditModule: @Audited on flow and bot-setting changes
  imports: [AiModule, KnowledgeBaseModule, MessagesModule, BillingModule, AuditModule],
  controllers: [ChatbotController],
  providers: [
    ChatbotRepository,
    ExecuteChatbotFlowUseCase,
    SimulateChatbotFlowUseCase,
    EncryptionService,
    // Handover, opening hours, pause after a team reply
    BotBehaviorRepository,
    BotBehaviorService,
    // Health strip + suspicious messages on the Chatbot page
    GetBotInsightsUseCase,
  ],
  exports: [ChatbotRepository, ExecuteChatbotFlowUseCase],
})
export class ChatbotModule {}
