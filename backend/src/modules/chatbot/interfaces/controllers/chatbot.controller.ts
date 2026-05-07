import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { ChatbotRepository } from '../../infrastructure/repositories/chatbot.repository';
import { ExecuteChatbotFlowUseCase } from '../../application/use-cases/execute-chatbot-flow.use-case';
import { SimulateChatbotFlowUseCase } from '../../application/use-cases/simulate-chatbot-flow.use-case';
import { CreateFlowDto, UpdateFlowDto, SaveNodesDto, SimulateFlowDto } from '../../application/dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotRepo: ChatbotRepository,
    private readonly executeChatbotFlow: ExecuteChatbotFlowUseCase,
    private readonly simulateChatbotFlow: SimulateChatbotFlowUseCase,
  ) {}

  @Post('flows')
  @Roles('ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  async createFlow(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFlowDto,
  ) {
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
  async updateFlow(
    @CurrentUser() user: JwtPayload,
    @Param('flowId', ParseUUIDPipe) flowId: string,
    @Body() dto: UpdateFlowDto,
  ) {
    const flow = await this.chatbotRepo.findFlowById(flowId, user.orgId);
    if (!flow) throw new NotFoundException('Flow not found');
    return this.chatbotRepo.updateFlow(flowId, dto);
  }

  @Post('flows/:flowId/nodes')
  @Roles('ADMIN', 'MANAGER')
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
  @HttpCode(HttpStatus.OK)
  async activateFlow(
    @CurrentUser() user: JwtPayload,
    @Param('flowId', ParseUUIDPipe) flowId: string,
  ) {
    const flow = await this.chatbotRepo.findFlowById(flowId, user.orgId);
    if (!flow) throw new NotFoundException('Flow not found');
    return this.chatbotRepo.updateFlow(flowId, { isActive: true });
  }

  @Post('flows/:flowId/deactivate')
  @Roles('ADMIN', 'MANAGER')
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
