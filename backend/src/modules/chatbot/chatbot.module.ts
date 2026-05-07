import { Module } from '@nestjs/common';
import { AiModule } from '@/modules/ai/ai.module';
import { KnowledgeBaseModule } from '@/modules/knowledge-base/knowledge-base.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { EncryptionService } from '@/common/services';
import { ChatbotRepository } from './infrastructure/repositories/chatbot.repository';
import { ChatbotController } from './interfaces/controllers/chatbot.controller';
import { ExecuteChatbotFlowUseCase } from './application/use-cases/execute-chatbot-flow.use-case';
import { SimulateChatbotFlowUseCase } from './application/use-cases/simulate-chatbot-flow.use-case';

@Module({
  imports: [AiModule, KnowledgeBaseModule, MessagesModule],
  controllers: [ChatbotController],
  providers: [ChatbotRepository, ExecuteChatbotFlowUseCase, SimulateChatbotFlowUseCase, EncryptionService],
  exports: [ChatbotRepository, ExecuteChatbotFlowUseCase],
})
export class ChatbotModule {}
