import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrgRepository } from '../../infrastructure/repositories/org.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { UpdateOrgSettingsDto } from '../dto/update-org-settings.dto';
import { EVENT_NAMES } from '@/common/constants';
import { Organization, Prisma } from '@prisma/client';
import { UpdateOrgSettingsInput } from '../../infrastructure/repositories/org.repository';

@Injectable()
export class UpdateOrgSettingsUseCase {
  private readonly logger = new Logger(UpdateOrgSettingsUseCase.name);

  constructor(
    private readonly orgRepository: OrgRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: UpdateOrgSettingsDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Organization> {
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Build the changeset — only include fields that actually changed
    const changes: Record<string, unknown> = {};
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined && dto.name !== org.name) {
      updateData.name = dto.name.trim();
      changes.name = { from: org.name, to: dto.name.trim() };
    }

    if (dto.timezone !== undefined && dto.timezone !== org.timezone) {
      updateData.timezone = dto.timezone;
      changes.timezone = { from: org.timezone, to: dto.timezone };
    }

    if (dto.branding !== undefined) {
      updateData.branding = dto.branding;
      changes.branding = { from: org.branding, to: dto.branding };
    }

    if (dto.industry !== undefined && dto.industry !== org.industry) {
      updateData.industry = dto.industry;
      changes.industry = { from: org.industry, to: dto.industry };
    }

    if (dto.description !== undefined && dto.description !== org.description) {
      updateData.description = dto.description;
      changes.description = { from: org.description, to: dto.description };
    }

    if (dto.website !== undefined && dto.website !== org.website) {
      updateData.website = dto.website;
      changes.website = { from: org.website, to: dto.website };
    }

    // No changes detected
    if (Object.keys(updateData).length === 0) {
      return org;
    }

    const updated = await this.orgRepository.update(
      orgId,
      updateData as UpdateOrgSettingsInput,
    );

    // Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: 'ORG_SETTINGS_UPDATED',
      targetType: 'Organization',
      targetId: orgId,
      metadata: { changes },
      ipAddress,
      userAgent,
    });

    // Emit event for real-time updates
    this.eventEmitter.emit(EVENT_NAMES.ORG_SETTINGS_UPDATED, {
      orgId,
      userId,
      changes,
    });

    this.logger.log(
      `Organization ${orgId} settings updated by user ${userId}`,
    );

    return updated;
  }
}
