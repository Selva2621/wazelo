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
  ) {}

  // ─── Website chats (Inbox → Website) ───

  @Get('chats')
  @Permissions(PERMISSIONS.CONVERSATIONS_READ)
  listChats(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.chats.list(user.orgId, status === 'closed' ? 'closed' : 'open', Number(page) || 1);
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
    return this.chats.reply(user.orgId, sessionId, dto.body);
  }

  @Post('chats/:sessionId/status')
  @Permissions(PERMISSIONS.CONVERSATIONS_UPDATE)
  @HttpCode(HttpStatus.OK)
  setChatStatus(
    @CurrentUser() user: JwtPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: WebsiteChatStatusDto,
  ) {
    return this.chats.setStatus(user.orgId, sessionId, dto.status);
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
