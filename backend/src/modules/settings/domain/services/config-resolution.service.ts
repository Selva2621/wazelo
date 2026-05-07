import { Injectable, Logger } from '@nestjs/common';
import { SettingScope } from '@prisma/client';
import { SettingsRepository } from '../../infrastructure/repositories/settings.repository';
import { ResolvedSetting } from '../entities/setting.entity';
import { ResolvedFeatureFlag } from '../entities/feature-flag.entity';
import { SETTINGS_CONFIG } from '@/common/constants';

/**
 * Config Resolution Service
 *
 * Implements the override hierarchy:
 *   SYSTEM (lowest priority) → PLAN → ORG (highest priority)
 *
 * For settings: ORG overrides PLAN overrides SYSTEM.
 * For feature flags: ORG can enable only if PLAN/SYSTEM allows (AND logic upward).
 *
 * Includes an in-memory TTL cache to reduce DB load for hot-path reads.
 */
@Injectable()
export class ConfigResolutionService {
  private readonly logger = new Logger(ConfigResolutionService.name);

  /** In-memory cache: key → { value, expiresAt } */
  private readonly cache = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly cacheTtlMs = SETTINGS_CONFIG.CACHE_TTL_SECONDS * 1000;

  constructor(private readonly settingsRepository: SettingsRepository) {}

  /**
   * Resolve a single setting value with scope hierarchy.
   * Returns the most-specific scope value, or null if not found.
   */
  async resolveSetting(
    orgId: string,
    category: string,
    key: string,
  ): Promise<ResolvedSetting | null> {
    const cacheKey = `setting:${orgId}:${category}:${key}`;
    const cached = this.getFromCache<ResolvedSetting>(cacheKey);
    if (cached !== undefined) return cached;

    // Fetch all scopes in a single query
    const settings = await this.settingsRepository.findByKey(category, key, orgId);

    if (settings.length === 0) return null;

    // Build scope map
    const scopeMap = new Map<SettingScope, typeof settings[0]>();
    for (const setting of settings) {
      scopeMap.set(setting.scope, setting);
    }

    // Resolve: ORG > PLAN > SYSTEM
    const resolved = scopeMap.get(SettingScope.ORG)
      ?? scopeMap.get(SettingScope.PLAN)
      ?? scopeMap.get(SettingScope.SYSTEM)
      ?? null;

    if (!resolved) return null;

    const result: ResolvedSetting = {
      key: resolved.key,
      category: resolved.category,
      value: resolved.value,
      valueType: resolved.valueType as ResolvedSetting['valueType'],
      resolvedScope: resolved.scope,
      isSecret: resolved.isSecret,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Resolve all settings for a category with scope hierarchy.
   */
  async resolveCategory(orgId: string, category: string): Promise<ResolvedSetting[]> {
    const cacheKey = `category:${orgId}:${category}`;
    const cached = this.getFromCache<ResolvedSetting[]>(cacheKey);
    if (cached !== undefined) return cached;

    const settings = await this.settingsRepository.findByCategory(category, orgId);

    // Group by key, then resolve each
    const keyMap = new Map<string, Map<SettingScope, typeof settings[0]>>();
    for (const setting of settings) {
      if (!keyMap.has(setting.key)) {
        keyMap.set(setting.key, new Map());
      }
      keyMap.get(setting.key)!.set(setting.scope, setting);
    }

    const results: ResolvedSetting[] = [];
    for (const [, scopes] of keyMap) {
      const resolved = scopes.get(SettingScope.ORG)
        ?? scopes.get(SettingScope.PLAN)
        ?? scopes.get(SettingScope.SYSTEM)
        ?? null;

      if (resolved) {
        results.push({
          key: resolved.key,
          category: resolved.category,
          value: resolved.value,
          valueType: resolved.valueType as ResolvedSetting['valueType'],
          resolvedScope: resolved.scope,
          isSecret: resolved.isSecret,
        });
      }
    }

    this.setCache(cacheKey, results);
    return results;
  }

  /**
   * Resolve a feature flag with scope hierarchy.
   *
   * Logic:
   * - If SYSTEM disables → disabled regardless
   * - If PLAN disables → disabled regardless of ORG
   * - ORG can only enable if PLAN allows (or PLAN flag doesn't exist → allowed)
   * - Expired flags are treated as disabled
   */
  async resolveFeatureFlag(
    orgId: string,
    featureKey: string,
    planFeatureEnabled?: boolean,
  ): Promise<ResolvedFeatureFlag> {
    const cacheKey = `flag:${orgId}:${featureKey}`;
    const cached = this.getFromCache<ResolvedFeatureFlag>(cacheKey);
    if (cached !== undefined) return cached;

    const flags = await this.settingsRepository.findFeatureFlagByKey(featureKey, orgId);

    const scopeMap = new Map<SettingScope, typeof flags[0]>();
    for (const flag of flags) {
      scopeMap.set(flag.scope, flag);
    }

    const systemFlag = scopeMap.get(SettingScope.SYSTEM);
    const orgFlag = scopeMap.get(SettingScope.ORG);

    // Check if system-level explicitly disables
    if (systemFlag && !systemFlag.enabled) {
      const result: ResolvedFeatureFlag = {
        featureKey,
        enabled: false,
        resolvedScope: SettingScope.SYSTEM,
        planAllows: planFeatureEnabled ?? true,
        orgOverride: orgFlag?.enabled ?? null,
        expired: false,
      };
      this.setCache(cacheKey, result);
      return result;
    }

    // Check plan-level (from billing Plan model)
    const planAllows = planFeatureEnabled ?? true;
    if (!planAllows) {
      const result: ResolvedFeatureFlag = {
        featureKey,
        enabled: false,
        resolvedScope: SettingScope.PLAN,
        planAllows: false,
        orgOverride: orgFlag?.enabled ?? null,
        expired: false,
      };
      this.setCache(cacheKey, result);
      return result;
    }

    // Check org-level
    if (orgFlag) {
      const expired = orgFlag.expiresAt ? new Date() > orgFlag.expiresAt : false;
      const result: ResolvedFeatureFlag = {
        featureKey,
        enabled: expired ? false : orgFlag.enabled,
        resolvedScope: SettingScope.ORG,
        planAllows: true,
        orgOverride: orgFlag.enabled,
        expired,
      };
      this.setCache(cacheKey, result);
      return result;
    }

    // Fallback to system flag or default enabled
    const result: ResolvedFeatureFlag = {
      featureKey,
      enabled: systemFlag?.enabled ?? false,
      resolvedScope: systemFlag ? SettingScope.SYSTEM : SettingScope.ORG,
      planAllows: true,
      orgOverride: null,
      expired: false,
    };
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Invalidate all cache entries for an org.
   */
  invalidateOrg(orgId: string): void {
    const prefix = orgId;
    for (const key of this.cache.keys()) {
      if (key.includes(prefix)) {
        this.cache.delete(key);
      }
    }
    this.logger.debug(`Cache invalidated for org ${orgId}`);
  }

  /**
   * Invalidate the entire cache (e.g., on system-level changes).
   */
  invalidateAll(): void {
    this.cache.clear();
    this.logger.debug('Full config cache invalidated');
  }

  private getFromCache<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  private setCache(key: string, value: unknown): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }
}
