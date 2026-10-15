import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PlatformKillSwitch } from '@prisma/client';
import { KillSwitchRepository } from '../../infrastructure/repositories/kill-switch.repository';
import { FeatureKey } from './entitlements';
import { FEATURE_DISABLED_PLATFORM, killSwitchMessage } from './kill-switch';

const CACHE_TTL_MS = 15_000;

/** 403 returned to tenants while a feature is switched off platform-wide. */
export class FeatureDisabledPlatformException extends ForbiddenException {
  constructor(feature: FeatureKey) {
    super({
      statusCode: 403,
      error: FEATURE_DISABLED_PLATFORM,
      message: killSwitchMessage(feature),
      details: { feature },
    });
  }
}

/**
 * Platform kill switches, read on every feature check (API requests and
 * workers) so the whole table is cached for 15s. The platform runs a single
 * instance, and `invalidate()` is called right after a super admin change.
 */
@Injectable()
export class KillSwitchService {
  private readonly logger = new Logger(KillSwitchService.name);
  private cache: { rows: PlatformKillSwitch[]; expiresAt: number } | null = null;

  constructor(private readonly repo: KillSwitchRepository) {}

  async all(): Promise<PlatformKillSwitch[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.rows;
    try {
      const rows = await this.repo.findAll();
      this.cache = { rows, expiresAt: Date.now() + CACHE_TTL_MS };
      return rows;
    } catch (err) {
      // Fail open on a read error (keep the last known state if we have one):
      // a DB blip must not take every feature down with it.
      this.logger.error(`Kill switch read failed: ${err instanceof Error ? err.message : String(err)}`);
      const rows = this.cache?.rows ?? [];
      // Short back-off so a DB outage isn't hammered on every feature check
      this.cache = { rows, expiresAt: Date.now() + 5_000 };
      return rows;
    }
  }

  async isDisabled(feature: FeatureKey): Promise<boolean> {
    const rows = await this.all();
    return rows.some((r) => r.feature === feature && r.disabled);
  }

  /** Throws FEATURE_DISABLED_PLATFORM (403) when the feature is switched off. */
  async assertEnabled(feature: FeatureKey): Promise<void> {
    if (await this.isDisabled(feature)) throw new FeatureDisabledPlatformException(feature);
  }

  /** Next read goes to the database (the last rows stay as the read-error fallback). */
  invalidate(): void {
    if (this.cache) this.cache.expiresAt = 0;
  }
}
