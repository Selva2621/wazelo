import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ConflictException,
  NotFoundException,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { UsageLimitGuard, USAGE_LIMIT_KEY } from '@/modules/billing/interfaces/guards/usage-limit.guard';
import { UsageMetricType } from '@prisma/client';
import { TemplateRepository } from '../../infrastructure/repositories/template.repository';
import { SyncTemplatesUseCase } from '../../application/use-cases/sync-templates.use-case';
import { SendTemplateMessageUseCase } from '../../application/use-cases/send-template-message.use-case';
import { GenerateTemplateUseCase } from '../../application/use-cases/generate-template.use-case';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
  MaxLength,
  IsEnum,
  Matches,
} from 'class-validator';

enum TemplateStatusFilter {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

class CreateTemplateDto {
  @IsString() @IsNotEmpty() @MaxLength(255) name: string;
  @IsString() @IsNotEmpty() @MaxLength(1024) body: string;
  @IsOptional() @IsString() @MaxLength(50) category?: string;
  @IsOptional() @IsString() @MaxLength(10) language?: string;
  @IsOptional() @IsUUID() productId?: string;
}

class UpdateTemplateDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(1024) body?: string;
  @IsOptional() @IsString() @MaxLength(50) category?: string;
  @IsOptional() @IsString() @MaxLength(10) language?: string;
  @IsOptional() @IsUUID() productId?: string;
}

class GenerateTemplateDto {
  @IsString() @IsNotEmpty() @MaxLength(500) prompt: string;
  @IsOptional() @IsString() @MaxLength(50) category?: string;
  @IsOptional() @IsString() @MaxLength(10) language?: string;
}

class SendTemplateDto {
  @IsUUID() channelId: string;
  @IsUUID() templateId: string;
  @IsString() @IsNotEmpty() @MaxLength(20) @Matches(/^\+?[0-9]{7,15}$/) contactPhone: string;
  @IsOptional() @IsObject() variables?: Record<string, string>;
  @IsOptional() @IsUUID() conversationId?: string;
  @IsOptional() @IsString() idempotencyKey?: string;
}

@Controller('messaging/templates')
export class TemplatesController {
  constructor(
    private readonly templateRepo: TemplateRepository,
    private readonly syncTemplates: SyncTemplatesUseCase,
    private readonly sendTemplate: SendTemplateMessageUseCase,
    private readonly generateTemplate: GenerateTemplateUseCase,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.MESSAGES_READ)
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: TemplateStatusFilter,
  ) {
    return this.templateRepo.list(user.orgId, status);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.MESSAGES_READ)
  async getById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templateRepo.findById(id, user.orgId);
  }

  @Post()
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.MESSAGE_TEMPLATES)
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTemplateDto) {
    const existing = await this.templateRepo.findByName(
      user.orgId,
      dto.name,
      dto.language ?? 'en',
    );
    if (existing) throw new ConflictException('A template with this name already exists');
    return this.templateRepo.create({
      orgId: user.orgId,
      name: dto.name,
      body: dto.body,
      language: dto.language,
      category: dto.category,
      productId: dto.productId,
    });
  }

  @Put(':id')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    const template = await this.templateRepo.findById(id, user.orgId);
    if (!template) throw new NotFoundException('Template not found');
    await this.templateRepo.update(id, user.orgId, {
      name: dto.name,
      body: dto.body,
      category: dto.category,
      language: dto.language,
      productId: dto.productId,
    });
    return this.templateRepo.findById(id, user.orgId);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const template = await this.templateRepo.findById(id, user.orgId);
    if (!template) throw new NotFoundException('Template not found');
    await this.templateRepo.softDelete(id, user.orgId);
  }

  @Post('generate')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  async generate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateTemplateDto,
  ) {
    return this.generateTemplate.execute({
      prompt: dto.prompt,
      category: dto.category,
      language: dto.language,
    });
  }

  @Post('sync')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  async sync(
    @CurrentUser() user: JwtPayload,
    @Body('channelId') channelId: string,
  ) {
    const count = await this.syncTemplates.execute(user.orgId, channelId);
    return { synced: count };
  }

  @Post('send')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  async send(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendTemplateDto,
  ) {
    return this.sendTemplate.execute({
      orgId: user.orgId,
      userId: user.sub,
      channelId: dto.channelId,
      templateId: dto.templateId,
      contactPhone: dto.contactPhone,
      variables: dto.variables,
      conversationId: dto.conversationId,
      idempotencyKey: dto.idempotencyKey,
    });
  }
}
