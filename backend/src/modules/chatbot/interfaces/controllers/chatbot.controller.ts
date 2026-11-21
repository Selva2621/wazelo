import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { ChatbotRepository } from '../../infrastructure/repositories/chatbot.repository';
import { ExecuteChatbotFlowUseCase } from '../../application/use-cases/execute-chatbot-flow.use-case';
import { SimulateChatbotFlowUseCase } from '../../application/use-cases/simulate-chatbot-flow.use-case';
import { CreateFlowDto, UpdateFlowDto, SaveNodesDto, SimulateFlowDto, BotBehaviorDto } from '../../application/dto';
import { BotBehaviorService } from '../../application/services/bot-behavior.service';
import { AuditAction } from '@prisma/client';
import { Audited } from '@/modules/audit/interfaces/decorators/audited.decorator';
import { GetBotInsightsUseCase } from '../../application/use-cases/get-bot-insights.use-case';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotRepo: ChatbotRepository,
    private readonly executeChatbotFlow: ExecuteChatbotFlowUseCase,
    private readonly simulateChatbotFlow: SimulateChatbotFlowUseCase,
    private readonly usageTracking: UsageTrackingService,
    private readonly botBehavior: BotBehaviorService,
    private readonly botInsights: GetBotInsightsUseCase,
  ) {}

  /** An AI-replying flow needs AI on the org's plan */
  private async assertAiAllowed(orgId: string, aiEnabled: boolean | undefined) {
    if (aiEnabled && !(await this.usageTracking.isFeatureEnabled(orgId, 'ai'))) {
      throw new ForbiddenException('AI replies are not included in your plan. Upgrade to use an AI chatbot.');
    }
  }

  // ─── Handover & opening hours (AI bot) ───

  @Get('behavior')
  @Roles('ADMIN', 'MANAGER')
  getBehavior(@CurrentUser('orgId') orgId: string) {
    return this.botBehavior.getSettings(orgId);
  }

  @Put('behavior')
  @Roles('ADMIN', 'MANAGER')
  @Audited({ action: AuditAction.CHATBOT_SETTINGS_UPDATED, targetType: 'BotSettings' })
  saveBehavior(@CurrentUser('orgId') orgId: string, @Body() dto: BotBehaviorDto) {
    return this.botBehavior.saveSettings(orgId, dto);
  }

  // ─── Auto-replies in one chat (inbox: "Bot paused · Resume") ───

  @Get('conversations/:conversationId/bot')
  @Permissions(PERMISSIONS.CONVERSATIONS_READ)
  getChatBot(
    @CurrentUser('orgId') orgId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.botBehavior.chatState(conversationId, orgId);
  }

  @Post('conversations/:conversationId/bot/pause')
  @Permissions(PERMISSIONS.CONVERSATIONS_UPDATE)
  @HttpCode(HttpStatus.OK)
  pauseChatBot(
    @CurrentUser('orgId') orgId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.botBehavior.pauseChat(conversationId, orgId);
  }

  @Post('conversations/:conversationId/bot/resume')
  @Permissions(PERMISSIONS.CONVERSATIONS_UPDATE)
  @HttpCode(HttpStatus.OK)
  resumeChatBot(
    @CurrentUser('orgId') orgId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.botBehavior.resumeChat(conversationId, orgId);
  }

  @Post('flows')
  @Roles('ADMIN', 'MANAGER')
  @Audited({ action: AuditAction.CHATBOT_FLOW_CREATED, targetType: 'ChatbotFlow' })
  @HttpCode(HttpStatus.CREATED)
  async createFlow(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFlowDto,
  ) {
    await this.assertAiAllowed(user.orgId, dto.aiEnabled);
    return this.chatbotRepo.createFlow({
      orgId: user.orgId,
      name: dto.name,
      description: dto.description,
      trigger: dto.trigger,
      nodes: dto.nodes,
      aiEnabled: dto.aiEnabled,
      aiSystemPrompt: dto.aiSystemPrompt,
      useKnowledgeBase: dto.useKnowledgeBase,
    });
  }

  /** Bot health for the last N days (default 7, max 90) and recent suspicious messages */
  @Get('insights')
  @Roles('ADMIN', 'MANAGER')
  getInsights(@CurrentUser('orgId') orgId: string, @Query('days') days?: string) {
    const n = Math.min(90, Math.max(1, Number.parseInt(days ?? '7', 10) || 7));
    return this.botInsights.execute(orgId, n);
  }

  @Get('flows')
  @Roles('ADMIN', 'MANAGER')
  async listFlows(@CurrentUser() user: JwtPayload) {
    return this.chatbotRepo.findFlowsByOrg(user.orgId);
  }

  @Get('flows/:flowId')
  @Roles('ADMIN', 'MANAGER')
  async getFlow(
    @CurrentUser() user: JwtPayload,
    @Param('flowId', ParseUUIDPipe) flowId: string,
  ) {
    const flow = await this.chatbotRepo.findFlowById(flowId, user.orgId);
    if (!flow) throw new NotFoundException('Flow not found');
    return flow;
  }

  @Patch('flows/:flowId')
  @Roles('ADMIN', 'MANAGER')
  @Audited({ action: AuditAction.CHATBOT_FLOW_UPDATED, targetType: 'ChatbotFlow', idParam: 'flowId' })
  async updateFlow(
    @CurrentUser() user: JwtPayload,
    @Param('flowId', ParseUUIDPipe) flowId: string,
    @Body() dto: UpdateFlowDto,
  ) {
    const flow = await this.chatbotRepo.findFlowById(flowId, user.orgId);
    if (!flow) throw new NotFoundException('Flow not found');
    await this.assertAiAllowed(user.orgId, dto.aiEnabled);
    return this.chatbotRepo.updateFlow(flowId, dto);
  }

  @Post('flows/:flowId/nodes')
  @Roles('ADMIN', 'MANAGER')
  @Audited({ action: AuditAction.CHATBOT_FLOW_UPDATED, targetType: 'ChatbotFlow', idParam: 'flowId' })
  @HttpCode(HttpStatus.OK)
  async saveNodes(
    @CurrentUser() user: JwtPayload,
    @Param('flowId', ParseUUIDPipe) flowId: string,
    @Body() dto: SaveNodesDto,
  ) {
    const flow = await this.chatbotRepo.findFlowById(flowId, user.orgId);
    if (!flow) throw new NotFoundException('Flow not found');
    await this.chatbotRepo.upsertNodes(flowId, dto.nodes);
    return this.chatbotRepo.findFlowById(flowId, user.orgId);
  }

  @Post('flows/:flowId/activate')
  @Roles('ADMIN', 'MANAGER')
  @Audited({ action: AuditAction.CHATBOT_FLOW_ACTIVATED, targetType: 'ChatbotFlow', idParam: 'flowId' })
  @HttpCode(HttpStatus.OK)
  async activateFlow(
    @CurrentUser() user: JwtPayload,
    @Param('flowId', ParseUUIDPipe) flowId: string,
  ) {
    const flow = await this.chatbotRepo.findFlowById(flowId, user.orgId);
    if (!flow) throw new NotFoundException('Flow not found');
    await this.assertAiAllowed(user.orgId, flow.aiEnabled);
    return this.chatbotRepo.updateFlow(flowId, { isActive: true });
  }

  @Post('flows/:flowId/deactivate')
  @Roles('ADMIN', 'MANAGER')
  @Audited({ action: AuditAction.CHATBOT_FLOW_DEACTIVATED, targetType: 'ChatbotFlow', idParam: 'flowId' })
  @HttpCode(HttpStatus.OK)
  async deactivateFlow(
    @CurrentUser() user: JwtPayload,
    @Param('flowId', ParseUUIDPipe) flowId: string,
  ) {
    const flow = await this.chatbotRepo.findFlowById(flowId, user.orgId);
    if (!flow) throw new NotFoundException('Flow not found');
    return this.chatbotRepo.updateFlow(flowId, { isActive: false });
  }

  @Delete('flows/:flowId')
  @Roles('ADMIN', 'MANAGER')
  @Audited({ action: AuditAction.CHATBOT_FLOW_DELETED, targetType: 'ChatbotFlow', idParam: 'flowId' })
  @HttpCode(HttpStatus.OK)
  async deleteFlow(
    @CurrentUser() user: JwtPayload,
    @Param('flowId', ParseUUIDPipe) flowId: string,
  ) {
    const flow = await this.chatbotRepo.findFlowById(flowId, user.orgId);
    if (!flow) throw new NotFoundException('Flow not found');
    await this.chatbotRepo.deleteFlow(flowId);
    return { success: true };
  }

  @Get('flows/:flowId/analytics')
  @Roles('ADMIN', 'MANAGER')
  async getFlowAnalytics(
    @CurrentUser() user: JwtPayload,
    @Param('flowId', ParseUUIDPipe) flowId: string,
  ) {
    return this.chatbotRepo.getFlowAnalytics(flowId, user.orgId);
  }

  @Post('flows/:flowId/simulate')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async simulateFlow(
    @CurrentUser() user: JwtPayload,
    @Param('flowId', ParseUUIDPipe) flowId: string,
    @Body() dto: SimulateFlowDto,
  ) {
    const flow = await this.chatbotRepo.findFlowById(flowId, user.orgId);
    if (!flow) throw new NotFoundException('Flow not found');
    return this.simulateChatbotFlow.execute(flow, dto.messageBody);
  }
}
