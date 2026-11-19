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
} from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { CannedResponseRepository } from '../../infrastructure/repositories/canned-response.repository';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const SHORTCUT = /^[a-z0-9_-]+$/i;
const SHORTCUT_MSG = 'Shortcut can use letters, numbers, - and _ only (no spaces)';

class CreateCannedResponseDto {
  @IsString() @IsNotEmpty() @MaxLength(100) title: string;
  @IsString() @IsNotEmpty() @MaxLength(4096) content: string;
  @IsOptional() @IsString() @MaxLength(50) @Matches(SHORTCUT, { message: SHORTCUT_MSG }) shortcut?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
}

class UpdateCannedResponseDto {
  @IsOptional() @IsString() @MaxLength(100) title?: string;
  @IsOptional() @IsString() @MaxLength(4096) content?: string;
  @IsOptional() @IsString() @MaxLength(50) @Matches(SHORTCUT, { message: SHORTCUT_MSG }) shortcut?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
}

@Controller('messaging/canned-responses')
export class CannedResponsesController {
  constructor(private readonly cannedRepo: CannedResponseRepository) {}

  @Post()
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCannedResponseDto,
  ) {
    await this.assertShortcutFree(user.orgId, dto.shortcut);
    return this.cannedRepo.create({
      orgId: user.orgId,
      title: dto.title,
      content: dto.content,
      shortcut: dto.shortcut,
      category: dto.category,
      createdById: user.sub,
    });
  }

  @Get()
  @Permissions(PERMISSIONS.MESSAGES_READ)
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('category') category?: string,
  ) {
    return this.cannedRepo.list(user.orgId, category);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCannedResponseDto,
  ) {
    await this.assertShortcutFree(user.orgId, dto.shortcut, id);
    await this.cannedRepo.update(id, user.orgId, dto);
    return this.cannedRepo.findById(id, user.orgId);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.cannedRepo.softDelete(id, user.orgId);
  }

  /** A clear 409 instead of a database error when the shortcut is taken */
  private async assertShortcutFree(orgId: string, shortcut: string | undefined, selfId?: string) {
    if (!shortcut) return;
    const taken = await this.cannedRepo.findByShortcut(orgId, shortcut);
    if (taken && taken.id !== selfId) {
      throw new ConflictException(`The shortcut /${shortcut} is already used by another quick reply`);
    }
  }

  @Post(':id/use')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  @HttpCode(HttpStatus.OK)
  async recordUsage(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    await this.cannedRepo.incrementUsage(id, user.orgId);
    return { success: true };
  }
}
