import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Request } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { DocumentProcessorService } from '@/modules/knowledge-base/domain/services/document-processor.service';
import { UpdateOrgSettingsDto } from '../../application/dto';
import { GetOrgSettingsUseCase } from '../../application/use-cases/get-org-settings.use-case';
import { UpdateOrgSettingsUseCase } from '../../application/use-cases/update-org-settings.use-case';
import { RebuildOrgMemoryUseCase } from '../../application/use-cases/rebuild-org-memory.use-case';
import { OrgAiMemoryService } from '../../domain/services/org-ai-memory.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/octet-stream', // some browsers send this for PDFs
];

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.csv', '.md', '.markdown'];

class UpdateAiMemoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customContext?: string;
}

@Controller('org')
export class OrgController {
  constructor(
    private readonly getOrgSettingsUseCase: GetOrgSettingsUseCase,
    private readonly updateOrgSettingsUseCase: UpdateOrgSettingsUseCase,
    private readonly rebuildOrgMemory: RebuildOrgMemoryUseCase,
    private readonly orgAiMemory: OrgAiMemoryService,
    private readonly docProcessor: DocumentProcessorService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('settings')
  @Permissions(PERMISSIONS.ORG_READ)
  async getSettings(@CurrentUser() user: JwtPayload) {
    return this.getOrgSettingsUseCase.execute(user.orgId);
  }

  @Patch('settings')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.ORG_UPDATE)
  async updateSettings(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateOrgSettingsDto,
    @Req() req: Request,
  ) {
    return this.updateOrgSettingsUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ─── AI Memory endpoints ───────────────────────────────────────────────────

  @Get('ai-memory')
  @Permissions(PERMISSIONS.ORG_READ)
  async getAiMemory(@CurrentUser() user: JwtPayload) {
    const mem = await this.prisma.orgAiMemory.findUnique({
      where: { orgId: user.orgId },
    });
    if (!mem) return null;

    const context = await this.orgAiMemory.getContext(user.orgId);
    return {
      context,
      customContext: mem.customContext,
      shopifyStore: mem.shopifyStore,
      documentName: mem.documentName,
      builtAt: mem.builtAt,
      updatedAt: mem.updatedAt,
    };
  }

  @Post('ai-memory/rebuild')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.ORG_UPDATE)
  @HttpCode(HttpStatus.OK)
  async rebuildAiMemory(@CurrentUser() user: JwtPayload) {
    await this.rebuildOrgMemory.execute(user.orgId);
    return { success: true, message: 'AI memory rebuild triggered' };
  }

  @Patch('ai-memory')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.ORG_UPDATE)
  async updateAiMemory(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateAiMemoryDto,
  ) {
    await this.prisma.orgAiMemory.upsert({
      where: { orgId: user.orgId },
      create: { orgId: user.orgId, customContext: dto.customContext },
      update: { customContext: dto.customContext },
    });
    return { success: true };
  }

  // ─── Document upload ───────────────────────────────────────────────────────

  @Post('ai-memory/document')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.ORG_UPDATE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/org-docs',
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${uuid()}${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
      fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowed =
          ALLOWED_MIME_TYPES.includes(file.mimetype) ||
          ALLOWED_EXTENSIONS.includes(ext);
        cb(null, allowed);
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadDocument(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded or unsupported file type. Allowed: PDF, TXT, CSV, Markdown',
      );
    }

    // Resolve MIME from extension in case browser sends application/octet-stream
    const ext = path.extname(file.originalname).toLowerCase();
    const resolvedMime =
      ext === '.pdf' ? 'application/pdf'
      : ext === '.csv' ? 'text/csv'
      : ext === '.md' || ext === '.markdown' ? 'text/markdown'
      : file.mimetype;

    // Extract text from uploaded file
    const text = await this.docProcessor.extractText(file.path, resolvedMime);

    // Clean up temp file
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }

    if (!text.trim()) {
      throw new BadRequestException('Could not extract text from the uploaded document');
    }

    await this.orgAiMemory.storeDocument(user.orgId, text, file.originalname);

    return {
      success: true,
      documentName: file.originalname,
      extractedLength: text.length,
    };
  }

  @Delete('ai-memory/document')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.ORG_UPDATE)
  @HttpCode(HttpStatus.OK)
  async deleteDocument(@CurrentUser() user: JwtPayload) {
    await this.orgAiMemory.clearDocument(user.orgId);
    return { success: true };
  }
}
