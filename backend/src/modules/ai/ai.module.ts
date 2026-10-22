import { Module } from '@nestjs/common';
import { BillingModule } from '@/modules/billing/billing.module';
import { PlatformSettingsModule } from '@/modules/platform-settings/platform-settings.module';
import { EncryptionService } from '@/common/services';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';
import { AiProviderService } from './domain/services/ai-provider.service';
import { KbAnswerService } from './application/services/kb-answer.service';
import { KbChunkRepository } from '@/modules/knowledge-base/infrastructure/repositories/kb-chunk.repository';
import { KbMissRepository } from '@/modules/knowledge-base/infrastructure/repositories/kb-miss.repository';
import { GetSmartRepliesUseCase } from './application/use-cases/get-smart-replies.use-case';
import { SummarizeConversationUseCase } from './application/use-cases/summarize-conversation.use-case';
import { AnalyzeSentimentUseCase } from './application/use-cases/analyze-sentiment.use-case';
import { AutoCategorizeUseCase } from './application/use-cases/auto-categorize.use-case';
import { KbRagSearchUseCase } from './application/use-cases/kb-rag-search.use-case';
import { DetectIntentUseCase } from './application/use-cases/detect-intent.use-case';
import { OrgContextService } from './domain/services/org-context.service';
import { SuggestRoutingUseCase } from './application/use-cases/suggest-routing.use-case';
import { GenerateAiInsightsUseCase } from './application/use-cases/generate-ai-insights.use-case';
import { AiController } from './interfaces/controllers/ai.controller';

@Module({
  imports: [BillingModule, PlatformSettingsModule],
  controllers: [AiController],
  providers: [
    AiProviderService,
    // Answers from website pages / documents / articles (shared by chatbot, widget, inbox)
    KbChunkRepository,
    KbAnswerService,
    // Questions the chatbot/widget couldn't answer (the owner's report)
    KbMissRepository,
    // Message bodies are encrypted at rest; AI reads them straight from Prisma
    EncryptionService,
    MessageEncryptionService,
    OrgContextService,
    GetSmartRepliesUseCase,
    SummarizeConversationUseCase,
    AnalyzeSentimentUseCase,
    AutoCategorizeUseCase,
    KbRagSearchUseCase,
    DetectIntentUseCase,
    SuggestRoutingUseCase,
    GenerateAiInsightsUseCase,
  ],
  exports: [
    AiProviderService,
    KbChunkRepository,
    KbAnswerService,
    KbMissRepository,
    OrgContextService,
    AnalyzeSentimentUseCase,
    AutoCategorizeUseCase,
    KbRagSearchUseCase,
    DetectIntentUseCase,
    SuggestRoutingUseCase,
    GenerateAiInsightsUseCase,
  ],
})
export class AiModule {}
