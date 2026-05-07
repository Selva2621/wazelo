import { Module } from '@nestjs/common';
import { BillingModule } from '@/modules/billing/billing.module';
import { AiProviderService } from './domain/services/ai-provider.service';
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
  imports: [BillingModule],
  controllers: [AiController],
  providers: [
    AiProviderService,
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
