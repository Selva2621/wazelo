import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AuditAction } from '@prisma/client';
import { GdprRepository } from '../../infrastructure/repositories/gdpr.repository';

@Controller('gdpr')
export class GdprController {
  constructor(
    private readonly repo: GdprRepository,
    private readonly auditService: AuditService,
  ) {}

  /* ─── Consent Management ─── */

  @Post('contacts/:contactId/consent')
  @Permissions(PERMISSIONS.CONTACTS_UPDATE)
  async recordConsent(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Req() req: Request,
    @Body() dto: {
      consentType: string;
      granted: boolean;
      source: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    if (!dto.granted) {
      await this.repo.revokeConsent(contactId, orgId, dto.consentType);
    }

    const record = await this.repo.recordConsent({
      orgId,
      contactId,
      consentType: dto.consentType,
      granted: dto.granted,
      source: dto.source,
      ipAddress: req.ip,
      metadata: dto.metadata,
    });

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_UPDATED,
      targetType: 'ConsentRecord',
      targetId: record.id,
      metadata: { consentType: dto.consentType, granted: dto.granted, source: dto.source },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return record;
  }

  @Get('contacts/:contactId/consents')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getConsents(
    @CurrentUser('orgId') orgId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.repo.getConsents(contactId, orgId);
  }

  /* ─── Data Export (GDPR Article 20 — Right to Portability) ─── */

  @Post('contacts/:contactId/export')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async exportData(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Req() req: Request,
  ) {
    const dataRequest = await this.repo.createDataRequest({
      orgId,
      contactId,
      requestType: 'export',
      requestedById: userId,
    });

    const exportData = await this.repo.exportContactData(contactId, orgId);
    if (!exportData.contact) throw new NotFoundException('Contact not found');

    await this.repo.updateDataRequest(dataRequest.id, {
      status: 'completed',
      completedAt: new Date(),
    });

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_UPDATED,
      targetType: 'DataRequest',
      targetId: dataRequest.id,
      metadata: { requestType: 'export', contactId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return exportData;
  }

  /* ─── Data Erasure (GDPR Article 17 — Right to Erasure) ─── */

  @Post('contacts/:contactId/erase')
  @Permissions(PERMISSIONS.CONTACTS_DELETE)
  async eraseData(
    @CurrentUser('orgId') orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Req() req: Request,
    @Body() dto: { reason?: string },
  ) {
    // Create audit record BEFORE erasure (data won't exist after)
    const dataRequest = await this.repo.createDataRequest({
      orgId,
      contactId,
      requestType: 'erasure',
      requestedById: userId,
    });

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_DELETED,
      targetType: 'DataRequest',
      targetId: dataRequest.id,
      metadata: { requestType: 'erasure', contactId, reason: dto.reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const result = await this.repo.eraseContactData(contactId, orgId);

    await this.repo.updateDataRequest(dataRequest.id, {
      status: 'completed',
      completedAt: new Date(),
    });

    return result;
  }

  /* ─── Data Request History ─── */

  @Get('requests')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async listRequests(
    @CurrentUser('orgId') orgId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.repo.findDataRequests(
      orgId,
      take ? parseInt(take, 10) : 50,
      skip ? parseInt(skip, 10) : 0,
    );
  }
}
