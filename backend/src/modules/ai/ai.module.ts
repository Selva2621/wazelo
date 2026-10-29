import { Module } from '@nestjs/common';
import { BillingModule } from '@/modules/billing/billing.module';
import { PlatformSettingsModule } from '@/modules/platform-settings/platform-settings.module';
import { EncryptionService } from '@/common/services';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';
import { AiProviderService } from './domain/services/ai-provider.service';
import { AiReplyLimiterService } from './domain/services/ai-reply-limiter.service';
import { AiReplyLogRepository } from './infrastructure/repositories/ai-reply-log.repository';
import { AiReplyTrailService } from './application/services/ai-reply-trail.service';
import { KbAnswerService } from './application/services/kb-answer.service';
import { KbChunkRepository } from '@/modules/knowledge-base/infrastructure/repositories/kb-chunk.repository';
import { KbMissRepository } from '@/modules/knowledge-base/infrastructure/repositories/kb-miss.repository';
import { GetSmartRepliesUseCase } from './application/use-cases/get-smart-replies.use-case';
import { ReadChatUseCase } from './application/use-cases/read-chat.use-case';
import { SummarizeConversationUseCase } from './application/use-cases/summarize-conversation.use-case';
import { AnalyzeSentimentUseCase } from './application/use-cases/analyze-sentiment.use-case';
import { AutoCategorizeUseCase } from './application/use-cases/auto-categorize.use-case';
import { KbRagSearchUseCase } from './application/use-cases/kb-rag-search.use-case';
import { DetectIntentUseCase } from './application/use-cases/detect-intent.use-case';
import { OrgContextService } from './domain/services/org-context.service';
import { EmbeddingService } from './domain/services/embedding.service';
import { KnowledgeSearchService } from './domain/services/knowledge-search.service';
import { SuggestRoutingUseCase } from './application/use-cases/suggest-routing.use-case';
import { GenerateAiInsightsUseCase } from './application/use-cases/generate-ai-insights.use-case';
import { AiController } from './interfaces/controllers/ai.controller';

@Module({
  imports: [BillingModule, PlatformSettingsModule],
  controllers: [AiController],
  providers: [
    AiProviderService,
    // Caps automatic AI replies per widget visitor / IP / org and per WhatsApp chat
    AiReplyLimiterService,
    // One row per automatic bot decision (cost, outcome, no message text)
    AiReplyLogRepository,
    AiReplyTrailService,
    // Answers from website pages / documents / articles (shared by chatbot, widget, inbox)
    KbChunkRepository,
    // Meaning vectors + keyword/meaning search over the knowledge (pgvector)
    EmbeddingService,
    KnowledgeSearchService,
    KbAnswerService,
    // Questions the chatbot/widget couldn't answer (the owner's report)
    KbMissRepository,
    // Message bodies are encrypted at rest; AI reads them straight from Prisma
    EncryptionService,
    MessageEncryptionService,
    OrgContextService,
    GetSmartRepliesUseCase,
    ReadChatUseCase,
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
    AiReplyLimiterService,
    AiReplyLogRepository,
    AiReplyTrailService,
    KbChunkRepository,
    EmbeddingService,
    KnowledgeSearchService,
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
