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
import { CreateSettingDto, UpdateSettingDto, ListSettingsQueryDto } from '../dto/setting.dto';
import { EVENT_NAMES, SETTINGS_CONFIG } from '@/common/constants';
import { ResolvedSetting } from '../../domain/entities/setting.entity';

@Injectable()
export class ManageSettingsUseCase {
  private readonly logger = new Logger(ManageSettingsUseCase.name);

  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly configResolution: ConfigResolutionService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    orgId: string,
    userId: string,
    dto: CreateSettingDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Only ADMIN can create SYSTEM/PLAN scoped settings
    if (dto.scope !== SettingScope.ORG) {
      throw new ForbiddenException('Only system administrators can manage SYSTEM/PLAN settings');
    }

    // Check org limit
    const count = await this.settingsRepository.countSettingsByOrg(orgId);
    if (count >= SETTINGS_CONFIG.MAX_SETTINGS_PER_ORG) {
      throw new BadRequestException(
        `Maximum settings limit (${SETTINGS_CONFIG.MAX_SETTINGS_PER_ORG}) reached for this organization`,
      );
    }

    // Validate value matches declared type
    this.validateValueType(dto.value, dto.valueType);

    const setting = await this.settingsRepository.createSetting({
      orgId,
      scope: dto.scope,
      category: dto.category,
      key: dto.key,
      value: dto.value as any,
      valueType: dto.valueType,
      description: dto.description,
      isSecret: dto.isSecret,
    });

    // Invalidate cache
    this.configResolution.invalidateOrg(orgId);

    // Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: 'SETTING_UPDATED',
      targetType: 'Setting',
      targetId: setting.id,
      metadata: { category: dto.category, key: dto.key, scope: dto.scope },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.SETTING_UPDATED, {
      settingId: setting.id,
      orgId,
      scope: dto.scope,
      category: dto.category,
      key: dto.key,
      previousValue: null,
      newValue: dto.value,
      userId,
    });

    return this.sanitizeSetting(setting);
  }

  async update(
    id: string,
    orgId: string,
    userId: string,
    dto: UpdateSettingDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.settingsRepository.findSettingById(id, orgId);
    if (!existing) {
      throw new NotFoundException('Setting not found');
    }

    // Org users can only modify ORG-scoped settings
    if (existing.scope !== SettingScope.ORG) {
      throw new ForbiddenException('Cannot modify SYSTEM/PLAN settings');
    }

    if (dto.valueType) {
      this.validateValueType(dto.value, dto.valueType);
    }

    try {
      const updated = await this.settingsRepository.updateSetting(
        id,
        {
          value: dto.value as any,
          valueType: dto.valueType,
          description: dto.description,
          isSecret: dto.isSecret,
        },
        dto.version,
      );

      this.configResolution.invalidateOrg(orgId);

      await this.auditService.log({
        orgId,
        userId,
        action: 'SETTING_UPDATED',
        targetType: 'Setting',
        targetId: id,
        metadata: {
          category: existing.category,
          key: existing.key,
          previousValue: existing.isSecret ? '***' : existing.value,
          newValue: existing.isSecret ? '***' : dto.value,
        },
        ipAddress,
        userAgent,
      });

      this.eventEmitter.emit(EVENT_NAMES.SETTING_UPDATED, {
        settingId: id,
        orgId,
        scope: existing.scope,
        category: existing.category,
        key: existing.key,
        previousValue: existing.value,
        newValue: dto.value,
        userId,
      });

      return this.sanitizeSetting(updated);
    } catch (error) {
      if (error instanceof Error && error.message === 'CONCURRENT_MODIFICATION') {
        throw new ConflictException(
          'Setting was modified by another request. Please refresh and try again.',
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
    const existing = await this.settingsRepository.findSettingById(id, orgId);
    if (!existing) {
      throw new NotFoundException('Setting not found');
    }

    if (existing.scope !== SettingScope.ORG) {
      throw new ForbiddenException('Cannot delete SYSTEM/PLAN settings');
    }

    await this.settingsRepository.softDeleteSetting(id);
    this.configResolution.invalidateOrg(orgId);

    await this.auditService.log({
      orgId,
      userId,
      action: 'SETTING_DELETED',
      targetType: 'Setting',
      targetId: id,
      metadata: { category: existing.category, key: existing.key },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.SETTING_DELETED, {
      settingId: id,
      orgId,
      scope: existing.scope,
      category: existing.category,
      key: existing.key,
      userId,
    });
  }

  async list(orgId: string, query: ListSettingsQueryDto) {
    const settings = await this.settingsRepository.listSettings({
      orgId,
      scope: query.scope,
      category: query.category,
    });

    return settings.map((s) => this.sanitizeSetting(s));
  }

  async resolve(orgId: string, category: string, key?: string): Promise<ResolvedSetting | ResolvedSetting[]> {
    if (key) {
      const resolved = await this.configResolution.resolveSetting(orgId, category, key);
      if (!resolved) {
        throw new NotFoundException(`Setting ${category}.${key} not found`);
      }
      return this.sanitizeResolved(resolved);
    }

    const resolved = await this.configResolution.resolveCategory(orgId, category);
    return resolved.map((r) => this.sanitizeResolved(r));
  }

  private validateValueType(value: unknown, type: string): void {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new BadRequestException('Value must be a string');
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          throw new BadRequestException('Value must be a number');
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new BadRequestException('Value must be a boolean');
        }
        break;
      case 'json':
        if (typeof value !== 'object' || value === null) {
          throw new BadRequestException('Value must be a JSON object');
        }
        break;
    }
  }

  private sanitizeSetting(setting: any) {
    if (setting.isSecret) {
      return { ...setting, value: '***REDACTED***' };
    }
    return setting;
  }

  private sanitizeResolved(resolved: ResolvedSetting): ResolvedSetting {
    if (resolved.isSecret) {
      return { ...resolved, value: '***REDACTED***' };
    }
    return resolved;
  }
}
