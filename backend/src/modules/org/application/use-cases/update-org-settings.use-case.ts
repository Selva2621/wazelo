import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrgRepository } from '../../infrastructure/repositories/org.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { UpdateOrgSettingsDto } from '../dto/update-org-settings.dto';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { EVENT_NAMES, QUEUE_NAMES } from '@/common/constants';
import { Organization, OrgType, Prisma } from '@prisma/client';
import { UpdateOrgSettingsInput } from '../../infrastructure/repositories/org.repository';
import { PlatformSettingsService } from '@/modules/platform-settings/domain/services/platform-settings.service';
import { SetupOrgType } from '@/modules/platform-settings/domain/services/platform-settings';

const ORG_TYPE_LABELS: Record<SetupOrgType, string> = {
  TEAM: 'Team / Company',
  FREELANCER: 'Solo / Freelancer',
};

@Injectable()
export class UpdateOrgSettingsUseCase {
  private readonly logger = new Logger(UpdateOrgSettingsUseCase.name);

  constructor(
    private readonly orgRepository: OrgRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly queueService: QueueService,
    private readonly platformSettings: PlatformSettingsService,
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

    if (dto.orgType !== undefined && dto.orgType !== org.orgType) {
      // A super admin can close a type to new setups; orgs already on it keep it
      const { orgTypeSetup } = await this.platformSettings.get();
      const setupType = dto.orgType as string;
      if (setupType in orgTypeSetup && !orgTypeSetup[setupType as SetupOrgType]) {
        throw new ForbiddenException(
          `${ORG_TYPE_LABELS[setupType as SetupOrgType]} workspaces aren't available right now.`,
        );
      }
      updateData.orgType = dto.orgType;
      changes.orgType = { from: org.orgType, to: dto.orgType };
    }

    if (
      dto.freelancerTypes !== undefined &&
      [...dto.freelancerTypes].sort().join(',') !== [...org.freelancerTypes].sort().join(',')
    ) {
      updateData.freelancerTypes = dto.freelancerTypes;
      changes.freelancerTypes = { from: org.freelancerTypes, to: dto.freelancerTypes };
    }

    const service = dto.freelancerService?.trim() || null;
    if (dto.freelancerService !== undefined && service !== org.freelancerService) {
      updateData.freelancerService = service;
      changes.freelancerService = { from: org.freelancerService, to: service };
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

    // Becoming a FREELANCER, or saying what they do, seeds the freelancer templates
    // written for their line of work. Onboarding only adds missing templates, so
    // anything the user already has or edited is left alone.
    const isFreelancer = (dto.orgType ?? org.orgType) === OrgType.FREELANCER;
    if (isFreelancer && (changes.orgType || changes.freelancerTypes || changes.freelancerService)) {
      const types = [...(dto.freelancerTypes ?? org.freelancerTypes)].sort().join('+') || 'none';
      await this.queueService.publishOnce(
        QUEUE_NAMES.ORG_ONBOARDING,
        { orgId, mode: 'org-type-changed' },
        `org-templates:${orgId}:${types}`,
      );
    }

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
