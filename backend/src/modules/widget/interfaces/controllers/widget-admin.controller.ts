import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Req,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { WidgetChatsUseCase } from '../../application/use-cases/widget-chats.use-case';
import { WebsiteChatUseCase } from '../../application/use-cases/website-chat.use-case';
import { WebsiteHandoffService } from '../../application/services/website-handoff.service';
import { WebsiteLeadDecisionDto } from '../../application/dto/website-chat.dto';
import { WebsiteChatAssistUseCase } from '../../application/use-cases/website-chat-assist.use-case';
import { AiCredits } from '@/modules/billing/interfaces/guards/ai-credit.guard';
import { PlatformFeature } from '@/modules/billing/interfaces/guards/platform-feature.guard';

class WebsiteChatReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  body!: string;
}

class WebsiteChatStatusDto {
  @IsIn(['open', 'closed'])
  status!: 'open' | 'closed';
}
import { Request } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { JwtPayload } from '@/common/decorators/current-user.decorator';
import { GetWidgetConfigUseCase } from '../../application/use-cases/get-widget-config.use-case';
import { UpdateWidgetConfigUseCase } from '../../application/use-cases/update-widget-config.use-case';
import { UpdateWidgetConfigDto } from '../../application/dto/update-widget-config.dto';

@Controller('widget')
export class WidgetAdminController {
  constructor(
    private readonly getWidgetConfigUseCase: GetWidgetConfigUseCase,
    private readonly updateWidgetConfigUseCase: UpdateWidgetConfigUseCase,
    private readonly chats: WidgetChatsUseCase,
    private readonly handoff: WebsiteHandoffService,
    private readonly websiteChat: WebsiteChatUseCase,
    private readonly assist: WebsiteChatAssistUseCase,
  ) {}

  // ─── Website chats (Inbox → Website) ───

  @Get('chats')
  @Permissions(PERMISSIONS.CONVERSATIONS_READ)
  listChats(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.chats.list(user.orgId, status === 'closed' ? 'closed' : 'open', Number(page) || 1, 30, user.sub);
  }

  // ─── Handover: take the chat, pass, give it back to the AI, lead or not ───

  @Post('chats/:sessionId/accept')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  @HttpCode(HttpStatus.OK)
  acceptChat(@CurrentUser() user: JwtPayload, @Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.handoff.accept(user.orgId, sessionId, user.sub);
  }

  @Post('chats/:sessionId/decline')
  @Permissions(PERMISSIONS.CONVERSATIONS_READ)
  @HttpCode(HttpStatus.OK)
  declineChat(@CurrentUser() user: JwtPayload, @Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.handoff.decline(user.orgId, sessionId, user.sub);
  }

  @Post('chats/:sessionId/release')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  @HttpCode(HttpStatus.OK)
  releaseChat(@CurrentUser() user: JwtPayload, @Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.handoff.release(user.orgId, sessionId, user.sub);
  }

  @Post('chats/:sessionId/lead')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  decideLead(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: WebsiteLeadDecisionDto,
  ) {
    return this.websiteChat.decideLead(user.orgId, sessionId, user.sub, dto);
  }

  // ─── AI help for the member (charged like the WhatsApp inbox's) ───

  @Post('chats/:sessionId/ai/summary')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @PlatformFeature('ai')
  @AiCredits('read_chat')
  @HttpCode(HttpStatus.OK)
  summarizeChat(@CurrentUser() user: JwtPayload, @Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.assist.summary(user.orgId, sessionId, user.sub);
  }

  @Post('chats/:sessionId/ai/suggestions')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  @PlatformFeature('ai')
  @AiCredits('smart_reply')
  @HttpCode(HttpStatus.OK)
  suggestReplies(@CurrentUser() user: JwtPayload, @Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.assist.suggestions(user.orgId, sessionId, user.sub);
  }

  /** Everything that happened in the chat, in order */
  @Get('chats/:sessionId/timeline')
  @Permissions(PERMISSIONS.CONVERSATIONS_READ)
  chatTimeline(@CurrentUser() user: JwtPayload, @Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.websiteChat.timeline(user.orgId, sessionId);
  }

  @Get('chats/:sessionId/messages')
  @Permissions(PERMISSIONS.CONVERSATIONS_READ)
  chatMessages(@CurrentUser() user: JwtPayload, @Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.chats.messages(user.orgId, sessionId);
  }

  @Post('chats/:sessionId/reply')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  replyToChat(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: WebsiteChatReplyDto,
  ) {
    return this.chats.reply(user.orgId, sessionId, dto.body, user.sub);
  }

  @Post('chats/:sessionId/status')
  @Permissions(PERMISSIONS.CONVERSATIONS_UPDATE)
  @HttpCode(HttpStatus.OK)
  setChatStatus(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: WebsiteChatStatusDto,
  ) {
    return this.chats.setStatus(user.orgId, sessionId, dto.status, user.sub);
  }

  @Get('config')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async getConfig(@CurrentUser() user: JwtPayload) {
    return this.getWidgetConfigUseCase.execute(user.orgId);
  }

  @Put('config')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async updateConfig(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateWidgetConfigDto,
    @Req() req: Request,
  ) {
    return this.updateWidgetConfigUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
