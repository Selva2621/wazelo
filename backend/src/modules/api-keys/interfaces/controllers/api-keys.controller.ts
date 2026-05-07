import {
  Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AuditAction } from '@prisma/client';
import { ApiKeysRepository } from '../../infrastructure/repositories/api-keys.repository';

@Controller('api-keys')
export class ApiKeysController {
  constructor(
    private readonly repo: ApiKeysRepository,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async createKey(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
    @Body() dto: { name: string; scopes: string[]; expiresInDays?: number },
  ) {
    const result = await this.repo.createKey({
      orgId,
      name: dto.name,
      scopes: dto.scopes,
      expiresAt: dto.expiresInDays ? new Date(Date.now() + dto.expiresInDays * 86400_000) : undefined,
      createdById: userId,
    });

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SETTING_UPDATED,
      targetType: 'ApiKey',
      targetId: result.id,
      metadata: { name: dto.name, scopes: dto.scopes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return result;
  }

  @Get()
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async listKeys(@CurrentUser('orgId') orgId: string) {
    return this.repo.findByOrg(orgId);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async revokeKey(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    await this.repo.revokeKey(id, orgId);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SETTING_UPDATED,
      targetType: 'ApiKey',
      targetId: id,
      metadata: { action: 'revoke' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { revoked: true };
  }

  @Post(':id/rotate')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async rotateKey(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const result = await this.repo.rotateKey(id, orgId, userId);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.SETTING_UPDATED,
      targetType: 'ApiKey',
      targetId: id,
      metadata: { action: 'rotate', newKeyId: result?.id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return result;
  }
}
