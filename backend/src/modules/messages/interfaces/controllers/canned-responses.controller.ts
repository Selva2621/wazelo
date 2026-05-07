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
} from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { CannedResponseRepository } from '../../infrastructure/repositories/canned-response.repository';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

class CreateCannedResponseDto {
  @IsString() @IsNotEmpty() @MaxLength(100) title: string;
  @IsString() @IsNotEmpty() content: string;
  @IsOptional() @IsString() @MaxLength(50) shortcut?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
}

class UpdateCannedResponseDto {
  @IsOptional() @IsString() @MaxLength(100) title?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() @MaxLength(50) shortcut?: string;
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

  @Post(':id/use')
  @Permissions(PERMISSIONS.MESSAGES_SEND)
  @HttpCode(HttpStatus.OK)
  async recordUsage(@Param('id', ParseUUIDPipe) id: string) {
    await this.cannedRepo.incrementUsage(id);
    return { success: true };
  }
}
