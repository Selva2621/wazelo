import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { EmailAccountUseCase } from '../../application/use-cases/email-account.use-case';
import { EmailTemplatesUseCase } from '../../application/use-cases/email-templates.use-case';
import { GenerateEmailTemplateUseCase } from '../../application/use-cases/generate-email-template.use-case';
import { AiCredits } from '@/modules/billing/interfaces/guards/ai-credit.guard';
import { PlatformFeature } from '@/modules/billing/interfaces/guards/platform-feature.guard';
import {
  GenerateEmailTemplateDto,
  SaveEmailAccountDto,
  SaveEmailTemplateDto,
  TestEmailDto,
} from '../../application/dto/email.dto';

/** Settings → Email (the workspace's business email) and email templates */
@Controller('email')
export class EmailController {
  constructor(
    private readonly account: EmailAccountUseCase,
    private readonly templates: EmailTemplatesUseCase,
    private readonly generate: GenerateEmailTemplateUseCase,
  ) {}

  // ─── Account ───

  @Get('account')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  getAccount(@CurrentUser() user: JwtPayload) {
    return this.account.get(user.orgId);
  }

  @Put('account')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  saveAccount(@CurrentUser() user: JwtPayload, @Body() dto: SaveEmailAccountDto) {
    return this.account.save(user.orgId, user.sub, dto);
  }

  @Post('account/test')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @HttpCode(HttpStatus.OK)
  sendTest(@CurrentUser() user: JwtPayload, @Body() dto: TestEmailDto) {
    return this.account.sendTest(user.orgId, user.sub, dto.to);
  }

  @Delete('account')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  disconnect(@CurrentUser() user: JwtPayload) {
    return this.account.disconnect(user.orgId, user.sub);
  }

  /** The last emails sent, with status and reason */
  @Get('messages')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  recent(@CurrentUser() user: JwtPayload) {
    return this.account.recent(user.orgId);
  }

  // ─── Templates ───

  @Get('templates')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  listTemplates(@CurrentUser() user: JwtPayload) {
    return this.templates.list(user.orgId, user.sub);
  }

  @Get('templates/:id')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  getTemplate(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.templates.get(user.orgId, id);
  }

  /** Write with AI: a subject + message from a short request; the member reviews and saves */
  @Post('templates/generate')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  @PlatformFeature('ai')
  @AiCredits('smart_reply')
  @HttpCode(HttpStatus.OK)
  generateTemplate(@CurrentUser() user: JwtPayload, @Body() dto: GenerateEmailTemplateDto) {
    return this.generate.execute(user.orgId, dto.prompt, dto.language);
  }

  @Post('templates')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  createTemplate(@CurrentUser() user: JwtPayload, @Body() dto: SaveEmailTemplateDto) {
    return this.templates.create(user.orgId, user.sub, dto);
  }

  @Put('templates/:id')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  updateTemplate(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveEmailTemplateDto) {
    return this.templates.update(user.orgId, id, dto);
  }

  @Delete('templates/:id')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  deleteTemplate(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.templates.remove(user.orgId, id);
  }
}
