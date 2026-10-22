import {
  Controller, Get, Post, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus, ValidationPipe,
} from '@nestjs/common';
import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { AiCredits } from '@/modules/billing/interfaces/guards/ai-credit.guard';
import { PlatformFeature } from '@/modules/billing/interfaces/guards/platform-feature.guard';
import { GetSmartRepliesUseCase } from '../../application/use-cases/get-smart-replies.use-case';
import { SummarizeConversationUseCase } from '../../application/use-cases/summarize-conversation.use-case';
import { AnalyzeSentimentUseCase } from '../../application/use-cases/analyze-sentiment.use-case';
import { AutoCategorizeUseCase } from '../../application/use-cases/auto-categorize.use-case';
import { KbRagSearchUseCase } from '../../application/use-cases/kb-rag-search.use-case';
import { DetectIntentUseCase } from '../../application/use-cases/detect-intent.use-case';
import { SuggestRoutingUseCase } from '../../application/use-cases/suggest-routing.use-case';
import { GenerateAiInsightsUseCase } from '../../application/use-cases/generate-ai-insights.use-case';

class KbSearchQueryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(500)
  q: string;
}

/** Every route is metered by @AiCredits: refused without the credits, charged on success. */
@Controller('ai')
@PlatformFeature('ai')
export class AiController {
  constructor(
    private readonly getSmartReplies: GetSmartRepliesUseCase,
    private readonly summarizeConversation: SummarizeConversationUseCase,
    private readonly analyzeSentiment: AnalyzeSentimentUseCase,
    private readonly autoCategorize: AutoCategorizeUseCase,
    private readonly kbRagSearch: KbRagSearchUseCase,
    private readonly detectIntent: DetectIntentUseCase,
    private readonly suggestRouting: SuggestRoutingUseCase,
    private readonly generateInsights: GenerateAiInsightsUseCase,
  ) {}

  @Get('smart-replies/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @AiCredits('smart_reply')
  smartReplies(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.getSmartReplies.execute(conversationId, user.orgId);
  }

  @Post('summarize/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @AiCredits('summarize')
  @HttpCode(HttpStatus.OK)
  summarize(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.summarizeConversation.execute(conversationId, user.orgId);
  }

  @Get('sentiment/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @AiCredits('sentiment')
  sentiment(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.analyzeSentiment.execute(conversationId, user.orgId);
  }

  @Get('categorize/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @AiCredits('categorize')
  categorize(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.autoCategorize.execute(conversationId, user.orgId);
  }

  @Post('categorize/:conversationId/apply')
  @Permissions(PERMISSIONS.CONTACTS_UPDATE)
  @AiCredits('categorize')
  @HttpCode(HttpStatus.OK)
  applyCategorization(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.autoCategorize.applyToConversation(conversationId, user.orgId);
  }

  @Get('kb-search')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @AiCredits('kb_search')
  kbSearch(
    @CurrentUser() user: JwtPayload,
    @Query(new ValidationPipe({ transform: true, whitelist: true })) dto: KbSearchQueryDto,
  ) {
    return this.kbRagSearch.execute(dto.q, user.orgId);
  }

  @Get('kb-suggest/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @AiCredits('kb_search')
  kbSuggest(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.kbRagSearch.suggestForConversation(conversationId, user.orgId);
  }

  @Get('intent/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @AiCredits('intent')
  detectIntentEndpoint(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.detectIntent.execute(conversationId, user.orgId);
  }

  @Get('routing/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @AiCredits('routing')
  routingSuggestion(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.suggestRouting.execute(conversationId, user.orgId);
  }

  @Get('insights')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @AiCredits('insights')
  aiInsights(
    @CurrentUser() user: JwtPayload,
    @Query('period') period: '7d' | '30d',
  ) {
    return this.generateInsights.execute(user.orgId, period ?? '7d');
  }

  /** Full AI analysis — combines all AI features in one call. */
  @Post('analyze/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @AiCredits('full_analysis')
  @HttpCode(HttpStatus.OK)
  async fullAnalysis(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    const [sentiment, categorization, intent, kbSuggestions, summary] = await Promise.all([
      this.analyzeSentiment.execute(conversationId, user.orgId),
      this.autoCategorize.execute(conversationId, user.orgId),
      this.detectIntent.execute(conversationId, user.orgId),
      this.kbRagSearch.suggestForConversation(conversationId, user.orgId),
      this.summarizeConversation.execute(conversationId, user.orgId),
    ]);
    return { sentiment, categorization, intent, kbSuggestions, summary };
  }
}
