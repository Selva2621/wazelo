import {
  Controller, Get, Post, Param, Query, Body,
  ParseUUIDPipe, HttpCode, HttpStatus, UseGuards, SetMetadata, ValidationPipe,
} from '@nestjs/common';
import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { UsageLimitGuard, USAGE_LIMIT_KEY } from '@/modules/billing/interfaces/guards/usage-limit.guard';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
import { UsageMetricType } from '@prisma/client';
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

@Controller('ai')
export class AiController {
  constructor(
    private readonly getSmartReplies: GetSmartRepliesUseCase,
    private readonly summarizeConversation: SummarizeConversationUseCase,
    private readonly analyzeSentiment: AnalyzeSentimentUseCase,
    private readonly autoCategorize: AutoCategorizeUseCase,
    private readonly kbRagSearch: KbRagSearchUseCase,
    private readonly detectIntent: DetectIntentUseCase,
    private readonly usageTracking: UsageTrackingService,
    private readonly suggestRouting: SuggestRoutingUseCase,
    private readonly generateInsights: GenerateAiInsightsUseCase,
  ) {}

  @Get('smart-replies/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  async smartReplies(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    const result = await this.getSmartReplies.execute(conversationId, user.orgId);
    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS);
    return result;
  }

  @Post('summarize/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  @HttpCode(HttpStatus.OK)
  async summarize(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    const result = await this.summarizeConversation.execute(conversationId, user.orgId);
    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS);
    return result;
  }

  @Get('sentiment/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  async sentiment(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    const result = await this.analyzeSentiment.execute(conversationId, user.orgId);
    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS);
    return result;
  }

  @Get('categorize/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  async categorize(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    const result = await this.autoCategorize.execute(conversationId, user.orgId);
    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS);
    return result;
  }

  @Post('categorize/:conversationId/apply')
  @Permissions(PERMISSIONS.CONTACTS_UPDATE)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  @HttpCode(HttpStatus.OK)
  async applyCategorization(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    const result = await this.autoCategorize.applyToConversation(conversationId, user.orgId);
    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS);
    return result;
  }

  @Get('kb-search')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  async kbSearch(
    @CurrentUser() user: JwtPayload,
    @Query(new ValidationPipe({ transform: true, whitelist: true })) dto: KbSearchQueryDto,
  ) {
    const result = await this.kbRagSearch.execute(dto.q, user.orgId);
    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS);
    return result;
  }

  @Get('kb-suggest/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  async kbSuggest(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    const result = await this.kbRagSearch.suggestForConversation(conversationId, user.orgId);
    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS);
    return result;
  }

  @Get('intent/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  async detectIntentEndpoint(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    const result = await this.detectIntent.execute(conversationId, user.orgId);
    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS);
    return result;
  }

  @Get('routing/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  async routingSuggestion(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    const result = await this.suggestRouting.execute(conversationId, user.orgId);
    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS);
    return result;
  }

  @Get('insights')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  async aiInsights(
    @CurrentUser() user: JwtPayload,
    @Query('period') period: '7d' | '30d',
  ) {
    const result = await this.generateInsights.execute(user.orgId, period ?? '7d');
    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS);
    return result;
  }

  /**
   * Full AI analysis — combines all AI features in one call (costs 5 credits).
   */
  @Post('analyze/:conversationId')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
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

    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS, 5);
    return { sentiment, categorization, intent, kbSuggestions, summary };
  }
}
