import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Headers,
  BadRequestException,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  SetMetadata,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { ApiKeyGuard } from '@/modules/api-keys/interfaces/guards/api-key.guard';
import { ApiKeyResourceScope } from '@/modules/api-keys/interfaces/guards/api-key-scope.decorator';
import { ApiRequestLogInterceptor } from '../interceptors/api-request-log.interceptor';
import { UsageLimitGuard, USAGE_LIMIT_KEY } from '@/modules/billing/interfaces/guards/usage-limit.guard';
import { FeatureFlagGuard, FEATURE_FLAG_KEY } from '@/modules/billing/interfaces/guards/feature-flag.guard';
import { ApiCallLimitGuard } from '@/modules/billing/interfaces/guards/api-call-limit.guard';
import { UsageMetricType } from '@prisma/client';
import { DeveloperApiRepository } from '../../infrastructure/repositories/developer-api.repository';
import { DevSendMessageUseCase } from '../../application/use-cases/send-message.use-case';
import { DevSendBulkMessageUseCase } from '../../application/use-cases/send-bulk-message.use-case';
import { DevSendTemplateMessageUseCase } from '../../application/use-cases/send-template-message.use-case';
import { ApiKeysRepository } from '@/modules/api-keys/infrastructure/repositories/api-keys.repository';
import { OrgLocaleService } from '@/modules/org/domain/services/org-locale.service';
import {
  DevSendMessageDto,
  DevSendBulkMessageDto,
  DevSendTemplateDto,
  DevCreateContactDto,
  DevUpdateContactDto,
  DevCreateTemplateDto,
  DevListMessagesQueryDto,
  DevListContactsQueryDto,
  DevPageQueryDto,
  DevAddNoteDto,
  DevAddTagDto,
  DevChangeLeadStatusDto,
  DevListConversationsQueryDto,
  DevListDealsQueryDto,
  DevMoveDealDto,
} from '../../application/dto';
import { DealRepository } from '@/modules/deals/infrastructure/repositories/deal.repository';
import { DealLifecycleUseCase } from '@/modules/deals/application/use-cases/deal-lifecycle.use-case';
import { AddNoteUseCase } from '@/modules/contacts/application/use-cases/add-note.use-case';
import { AddTagUseCase, RemoveTagUseCase } from '@/modules/contacts/application/use-cases/manage-tags.use-case';
import { ChangeLeadStatusUseCase } from '@/modules/contacts/application/use-cases/change-lead-status.use-case';

/** Org and acting user (the key's creator) set by ApiKeyGuard. */
function auth(req: Request): { orgId: string; userId: string } {
  return (req as any).apiKeyAuth;
}

/**
 * The standard Idempotency-Key header works the same as the idempotencyKey
 * body field; the body field wins if both are sent.
 */
function withIdempotencyKey<T extends { idempotencyKey?: string }>(dto: T, header?: string): T {
  if (dto.idempotencyKey || !header) return dto;
  const key = header.trim();
  if (!key || key.length > 255) {
    throw new BadRequestException('Idempotency-Key must be 1-255 characters');
  }
  return { ...dto, idempotencyKey: key };
}

/**
 * Public Developer API — authenticated via X-API-Key header.
 * These are the endpoints developers call from their applications.
 */
@Controller('developer')
@Public() // Skip JWT auth
// API key auth → plan includes API → count the call against the monthly limit
@UseGuards(ApiKeyGuard, FeatureFlagGuard, ApiCallLimitGuard)
@SetMetadata(FEATURE_FLAG_KEY, 'api')
@UseInterceptors(ApiRequestLogInterceptor)
export class DeveloperApiController {
  constructor(
    private readonly repo: DeveloperApiRepository,
    private readonly sendMessageUseCase: DevSendMessageUseCase,
    private readonly sendBulkMessageUseCase: DevSendBulkMessageUseCase,
    private readonly sendTemplateMessageUseCase: DevSendTemplateMessageUseCase,
    private readonly apiKeysRepo: ApiKeysRepository,
    private readonly orgLocale: OrgLocaleService,
    private readonly addNoteUseCase: AddNoteUseCase,
    private readonly addTagUseCase: AddTagUseCase,
    private readonly removeTagUseCase: RemoveTagUseCase,
    private readonly changeLeadStatusUseCase: ChangeLeadStatusUseCase,
    private readonly dealRepo: DealRepository,
    private readonly dealLifecycle: DealLifecycleUseCase,
  ) {}

  // ── Messages ──

  @Post('messages/send')
  @ApiKeyResourceScope('messages')
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.MESSAGES_SENT)
  @UseGuards(UsageLimitGuard)
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Req() req: Request,
    @Body() dto: DevSendMessageDto,
    @Headers('idempotency-key') idempotencyHeader?: string,
  ) {
    const orgId = (req as any).apiKeyAuth.orgId;
    return this.sendMessageUseCase.execute(orgId, withIdempotencyKey(dto, idempotencyHeader));
  }

  @Post('messages/send-bulk')
  @ApiKeyResourceScope('messages')
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.MESSAGES_SENT)
  @UseGuards(UsageLimitGuard)
  @HttpCode(HttpStatus.OK)
  async sendBulkMessage(@Req() req: Request, @Body() dto: DevSendBulkMessageDto) {
    const orgId = (req as any).apiKeyAuth.orgId;
    return this.sendBulkMessageUseCase.execute(orgId, dto);
  }

  @Post('messages/send-template')
  @ApiKeyResourceScope('messages')
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.MESSAGES_SENT)
  @UseGuards(UsageLimitGuard)
  @HttpCode(HttpStatus.OK)
  async sendTemplateMessage(
    @Req() req: Request,
    @Body() dto: DevSendTemplateDto,
    @Headers('idempotency-key') idempotencyHeader?: string,
  ) {
    const orgId = (req as any).apiKeyAuth.orgId;
    return this.sendTemplateMessageUseCase.execute(orgId, withIdempotencyKey(dto, idempotencyHeader));
  }

  @Get('messages')
  @ApiKeyResourceScope('messages')
  async listMessages(
    @Req() req: Request,
    @Query() query: DevListMessagesQueryDto,
  ) {
    const orgId = (req as any).apiKeyAuth.orgId;
    return this.repo.listMessages(orgId, {
      limit: query.limit ?? 20,
      cursor: query.cursor,
      direction: query.direction,
      status: query.status,
    });
  }

  @Get('messages/:id')
  @ApiKeyResourceScope('messages')
  async getMessage(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const orgId = (req as any).apiKeyAuth.orgId;
    const message = await this.repo.getMessageById(id, orgId);
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  // ── Contacts ──

  @Get('contacts')
  @ApiKeyResourceScope('contacts')
  async listContacts(@Req() req: Request, @Query() query: DevListContactsQueryDto) {
    const { orgId } = auth(req);
    const phone = query.phone
      ? ((await this.orgLocale.normalizePhone(orgId, query.phone)) ?? query.phone)
      : undefined;
    return this.repo.listContacts(orgId, query.limit ?? 20, query.cursor, {
      search: query.search,
      phone,
      leadStatus: query.leadStatus,
    });
  }

  @Post('contacts')
  @ApiKeyResourceScope('contacts')
  @HttpCode(HttpStatus.CREATED)
  async createContact(
    @Req() req: Request,
    @Body() dto: DevCreateContactDto,
  ) {
    const orgId = (req as any).apiKeyAuth.orgId;
    return this.repo.createContact({
      orgId,
      name: dto.name,
      phoneNumber: (await this.orgLocale.normalizePhone(orgId, dto.phone)) ?? dto.phone,
      email: dto.email,
      metadata: dto.metadata,
    });
  }

  @Get('contacts/:id')
  @ApiKeyResourceScope('contacts')
  async getContact(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const orgId = (req as any).apiKeyAuth.orgId;
    const contact = await this.repo.getContactById(id, orgId);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  @Put('contacts/:id')
  @ApiKeyResourceScope('contacts')
  async updateContact(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DevUpdateContactDto,
  ) {
    const orgId = (req as any).apiKeyAuth.orgId;
    const contact = await this.repo.getContactById(id, orgId);
    if (!contact) throw new NotFoundException('Contact not found');
    await this.repo.updateContact(id, orgId, {
      name: dto.name,
      email: dto.email,
      metadata: dto.metadata,
    });
    return this.repo.getContactById(id, orgId);
  }

  @Put('contacts/:id/lead-status')
  @ApiKeyResourceScope('contacts')
  async changeLeadStatus(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DevChangeLeadStatusDto,
  ) {
    const { orgId, userId } = auth(req);
    await this.changeLeadStatusUseCase.execute(id, orgId, userId, dto, req.ip, req.headers['user-agent']);
    return this.repo.getContactById(id, orgId);
  }

  @Get('contacts/:id/notes')
  @ApiKeyResourceScope('contacts')
  async listNotes(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DevPageQueryDto,
  ) {
    const { orgId } = auth(req);
    const contact = await this.repo.getContactById(id, orgId);
    if (!contact) throw new NotFoundException('Contact not found');
    return this.repo.listContactNotes(id, orgId, query.limit ?? 20);
  }

  @Post('contacts/:id/notes')
  @ApiKeyResourceScope('contacts')
  @HttpCode(HttpStatus.CREATED)
  async addNote(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DevAddNoteDto,
  ) {
    const { orgId, userId } = auth(req);
    const note = await this.addNoteUseCase.execute(id, orgId, userId, dto, req.ip, req.headers['user-agent']);
    return { id: note.id, content: note.content, authorId: note.authorId, createdAt: note.createdAt };
  }

  @Post('contacts/:id/tags')
  @ApiKeyResourceScope('contacts')
  @HttpCode(HttpStatus.OK)
  async addTag(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DevAddTagDto,
  ) {
    const { orgId, userId } = auth(req);
    const tag = await this.addTagUseCase.execute(id, orgId, userId, dto, req.ip, req.headers['user-agent']);
    return { id: tag.id, name: tag.name, color: tag.color };
  }

  @Delete('contacts/:id/tags/:tagId')
  @ApiKeyResourceScope('contacts')
  @HttpCode(HttpStatus.OK)
  async removeTag(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    const { orgId, userId } = auth(req);
    await this.removeTagUseCase.execute(id, tagId, orgId, userId, req.ip, req.headers['user-agent']);
    return { removed: true };
  }

  @Get('tags')
  @ApiKeyResourceScope('contacts')
  async listTags(@Req() req: Request) {
    return this.repo.listTags(auth(req).orgId);
  }

  // ── Conversations ──

  @Get('conversations')
  @ApiKeyResourceScope('messages')
  async listConversations(@Req() req: Request, @Query() query: DevListConversationsQueryDto) {
    const { orgId } = auth(req);
    const contactPhone = query.contactPhone
      ? ((await this.orgLocale.normalizePhone(orgId, query.contactPhone)) ?? query.contactPhone)
      : undefined;
    return this.repo.listConversations(orgId, {
      limit: query.limit ?? 20,
      cursor: query.cursor,
      status: query.status,
      contactPhone,
      contactId: query.contactId,
    });
  }

  @Get('conversations/:id/messages')
  @ApiKeyResourceScope('messages')
  async listConversationMessages(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DevPageQueryDto,
  ) {
    const { orgId } = auth(req);
    const conversation = await this.repo.getConversation(id, orgId);
    if (!conversation) throw new NotFoundException('Conversation not found');
    return this.repo.listConversationMessages(id, orgId, query.limit ?? 20, query.cursor);
  }

  // ── Pipelines & deals ──

  @Get('pipelines')
  @ApiKeyResourceScope('contacts')
  async listPipelines(@Req() req: Request) {
    return this.repo.listPipelines(auth(req).orgId);
  }

  @Get('deals')
  @ApiKeyResourceScope('contacts')
  async listDeals(@Req() req: Request, @Query() query: DevListDealsQueryDto) {
    return this.repo.listDeals(auth(req).orgId, {
      limit: query.limit ?? 20,
      cursor: query.cursor,
      contactId: query.contactId,
      pipelineId: query.pipelineId,
      stageId: query.stageId,
      status: query.status,
    });
  }

  @Get('deals/:id')
  @ApiKeyResourceScope('contacts')
  async getDeal(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const deal = await this.repo.getDeal(id, auth(req).orgId);
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  /** Same path as dragging the card on the board: status follows the stage's won/lost flag. */
  @Put('deals/:id/stage')
  @ApiKeyResourceScope('contacts')
  async moveDeal(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DevMoveDealDto,
  ) {
    const { orgId } = auth(req);
    const deal = await this.dealRepo.findByIdAndOrg(id, orgId);
    if (!deal) throw new NotFoundException('Deal not found');
    await this.dealLifecycle.moveToStage(deal, dto.stageId);
    return this.repo.getDeal(id, orgId);
  }

  // ── Templates ──

  @Post('templates')
  @ApiKeyResourceScope('messages')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Req() req: Request, @Body() dto: DevCreateTemplateDto) {
    const orgId = (req as any).apiKeyAuth.orgId;
    return this.repo.createTemplate({
      orgId,
      name: dto.name,
      body: dto.body,
      language: dto.language,
      category: dto.category,
    });
  }

  @Get('templates')
  @ApiKeyResourceScope('messages')
  async listTemplates(@Req() req: Request) {
    const orgId = (req as any).apiKeyAuth.orgId;
    return this.repo.listTemplates(orgId);
  }

  // ── Session Status ──

  @Get('session/status')
  async getSessionStatus(@Req() req: Request) {
    const orgId = (req as any).apiKeyAuth.orgId;
    const sessions = await this.repo.getActiveSessions(orgId);
    return {
      connected: sessions.some((s) => s.status === 'CONNECTED'),
      sessions: sessions.map((s) => ({
        id: s.id,
        phoneNumber: s.phoneNumber,
        status: s.status,
        lastActiveAt: s.lastActiveAt,
      })),
    };
  }

  // ── API Keys ──

  @Get('keys')
  async listApiKeys(@Req() req: Request) {
    const orgId = (req as any).apiKeyAuth.orgId;
    return this.apiKeysRepo.findByOrg(orgId);
  }

  @Delete('keys/:id')
  @HttpCode(HttpStatus.OK)
  async revokeApiKey(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const orgId = (req as any).apiKeyAuth.orgId;
    await this.apiKeysRepo.revokeKey(id, orgId);
    return { revoked: true };
  }
}
