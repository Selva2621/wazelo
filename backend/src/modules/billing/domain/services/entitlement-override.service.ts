import { Injectable } from '@nestjs/common';
import { OrgEntitlementOverride } from '@prisma/client';
import { EntitlementOverrideRepository } from '../../infrastructure/repositories/entitlement-override.repository';

const CACHE_TTL_MS = 30_000;

/**
 * Per-org overrides for UsageTrackingService, cached because usage checks run
 * on every send. `invalidate()` is called by the super-admin module after a
 * change; other instances pick it up within the TTL.
 */
@Injectable()
export class EntitlementOverrideService {
  private readonly cache = new Map<string, { overrides: OrgEntitlementOverride[]; expiresAt: number }>();

  constructor(private readonly repo: EntitlementOverrideRepository) {}

  async forOrg(orgId: string): Promise<OrgEntitlementOverride[]> {
    const cached = this.cache.get(orgId);
    if (cached && cached.expiresAt > Date.now()) return cached.overrides;
    const overrides = await this.repo.findByOrg(orgId);
    this.cache.set(orgId, { overrides, expiresAt: Date.now() + CACHE_TTL_MS });
    return overrides;
  }

  invalidate(orgId: string): void {
    this.cache.delete(orgId);
  }
}
