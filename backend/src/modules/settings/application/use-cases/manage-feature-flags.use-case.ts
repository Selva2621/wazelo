import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SettingScope } from '@prisma/client';
import { SettingsRepository } from '../../infrastructure/repositories/settings.repository';
import { ConfigResolutionService } from '../../domain/services/config-resolution.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  ListFeatureFlagsQueryDto,
} from '../dto/feature-flag.dto';
import { EVENT_NAMES, SETTINGS_CONFIG } from '@/common/constants';
import { ResolvedFeatureFlag } from '../../domain/entities/feature-flag.entity';

@Injectable()
export class ManageFeatureFlagsUseCase {
  private readonly logger = new Logger(ManageFeatureFlagsUseCase.name);

  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly configResolution: ConfigResolutionService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    orgId: string,
    userId: string,
    dto: CreateFeatureFlagDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (dto.scope !== SettingScope.ORG) {
      throw new ForbiddenException('Only system administrators can manage SYSTEM/PLAN feature flags');
    }

    const count = await this.settingsRepository.countFeatureFlagsByOrg(orgId);
    if (count >= SETTINGS_CONFIG.MAX_FEATURE_FLAGS_PER_ORG) {
      throw new BadRequestException(
        `Maximum feature flags limit (${SETTINGS_CONFIG.MAX_FEATURE_FLAGS_PER_ORG}) reached`,
      );
    }

    const flag = await this.settingsRepository.createFeatureFlag({
      orgId,
      scope: dto.scope,
      featureKey: dto.featureKey,
      enabled: dto.enabled,
      metadata: dto.metadata as any,
      description: dto.description,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    this.configResolution.invalidateOrg(orgId);

    await this.auditService.log({
      orgId,
      userId,
      action: 'FEATURE_FLAG_CREATED',
      targetType: 'FeatureFlag',
      targetId: flag.id,
      metadata: { featureKey: dto.featureKey, enabled: dto.enabled, scope: dto.scope },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.FEATURE_FLAG_CREATED, {
      flagId: flag.id,
      orgId,
      scope: dto.scope,
      featureKey: dto.featureKey,
      enabled: dto.enabled,
      userId,
    });

    return flag;
  }

  async update(
    id: string,
    orgId: string,
    userId: string,
    dto: UpdateFeatureFlagDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.settingsRepository.findFeatureFlagById(id, orgId);
    if (!existing) {
      throw new NotFoundException('Feature flag not found');
    }

    if (existing.scope !== SettingScope.ORG) {
      throw new ForbiddenException('Cannot modify SYSTEM/PLAN feature flags');
    }

    try {
      const updated = await this.settingsRepository.updateFeatureFlag(
        id,
        {
          enabled: dto.enabled,
          metadata: dto.metadata as any,
          description: dto.description,
          expiresAt: dto.expiresAt === null ? null : dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        },
        dto.version,
      );

      this.configResolution.invalidateOrg(orgId);

      await this.auditService.log({
        orgId,
        userId,
        action: 'FEATURE_FLAG_UPDATED',
        targetType: 'FeatureFlag',
        targetId: id,
        metadata: {
          featureKey: existing.featureKey,
          previousEnabled: existing.enabled,
          enabled: dto.enabled ?? existing.enabled,
        },
        ipAddress,
        userAgent,
      });

      this.eventEmitter.emit(EVENT_NAMES.FEATURE_FLAG_UPDATED, {
        flagId: id,
        orgId,
        scope: existing.scope,
        featureKey: existing.featureKey,
        previousEnabled: existing.enabled,
        enabled: dto.enabled ?? existing.enabled,
        userId,
      });

      return updated;
    } catch (error) {
      if (error instanceof Error && error.message === 'CONCURRENT_MODIFICATION') {
        throw new ConflictException(
          'Feature flag was modified by another request. Please refresh and try again.',
        );
      }
      throw error;
    }
  }

  async delete(
    id: string,
    orgId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.settingsRepository.findFeatureFlagById(id, orgId);
    if (!existing) {
      throw new NotFoundException('Feature flag not found');
    }

    if (existing.scope !== SettingScope.ORG) {
      throw new ForbiddenException('Cannot delete SYSTEM/PLAN feature flags');
    }

    await this.settingsRepository.softDeleteFeatureFlag(id);
    this.configResolution.invalidateOrg(orgId);

    await this.auditService.log({
      orgId,
      userId,
      action: 'FEATURE_FLAG_DELETED',
      targetType: 'FeatureFlag',
      targetId: id,
      metadata: { featureKey: existing.featureKey },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.FEATURE_FLAG_DELETED, {
      flagId: id,
      orgId,
      scope: existing.scope,
      featureKey: existing.featureKey,
      userId,
    });
  }

  async list(orgId: string, query: ListFeatureFlagsQueryDto) {
    return this.settingsRepository.listFeatureFlags(orgId, query.scope);
  }

  async resolve(
    orgId: string,
    featureKey: string,
    planFeatureEnabled?: boolean,
  ): Promise<ResolvedFeatureFlag> {
    return this.configResolution.resolveFeatureFlag(orgId, featureKey, planFeatureEnabled);
  }

  /**
   * Check if a feature is enabled — used by other modules at runtime.
   */
  async isEnabled(orgId: string, featureKey: string): Promise<boolean> {
    const resolved = await this.configResolution.resolveFeatureFlag(orgId, featureKey);
    return resolved.enabled;
  }
}
