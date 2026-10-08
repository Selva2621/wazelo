import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntitlementKind, PlatformAuditAction, UsageMetricType } from '@prisma/client';
import { SubscriptionRepository } from '@/modules/billing/infrastructure/repositories/subscription.repository';
import { EntitlementOverrideRepository } from '@/modules/billing/infrastructure/repositories/entitlement-override.repository';
import { EntitlementOverrideService } from '@/modules/billing/domain/services/entitlement-override.service';
import {
  effectiveFeature,
  effectiveLimit,
  FEATURE_KEYS,
  FeatureKey,
  isOverrideActive,
} from '@/modules/billing/domain/services/entitlements';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';
import { SetEntitlementOverrideDto } from '../dto/entitlement.dto';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';

/** Plan field behind each usage metric — mirrors UsageTrackingService. */
const PLAN_LIMIT_FIELD: Record<UsageMetricType, string> = {
  MESSAGES_SENT: 'maxMessagesPerMonth',
  ACTIVE_USERS: 'maxUsers',
  WHATSAPP_SESSIONS: 'maxWhatsappSessions',
  CAMPAIGN_EXECUTIONS: 'maxCampaignsPerMonth',
  API_CALLS: 'maxApiCallsPerMonth',
  AI_CREDITS: 'aiCreditsPerMonth',
  MESSAGE_TEMPLATES: 'maxMessageTemplates',
};

const PLAN_FEATURE_FIELD: Record<FeatureKey, string> = {
  campaigns: 'campaignsEnabled',
  automation: 'automationEnabled',
  api: 'apiEnabled',
  ai: 'aiEnabled',
  shopify: 'shopifyEnabled',
};

function overrideSummary(o: { limitValue: number | null; enabled: boolean | null; expiresAt: Date | null; reason: string } | null) {
  return o ? { limitValue: o.limitValue, enabled: o.enabled, expiresAt: o.expiresAt?.toISOString() ?? null, reason: o.reason } : null;
}

/** Plan value, override and effective value for every limit and feature of one org. */
@Injectable()
export class GetOrgEntitlementsUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly overrideRepo: EntitlementOverrideRepository,
  ) {}

  async execute(orgId: string) {
    if (!(await this.platformRepo.findOrgBasics(orgId))) throw new NotFoundException('Organization not found');

    const [subscription, overrides] = await Promise.all([
      this.subscriptionRepo.findByOrgWithPlan(orgId),
      this.overrideRepo.findByOrg(orgId),
    ]);
    const plan = (subscription?.plan ?? null) as Record<string, any> | null;
    const now = new Date();

    const limits = (Object.keys(PLAN_LIMIT_FIELD) as UsageMetricType[]).map((metric) => {
      const planValue = plan ? Number(plan[PLAN_LIMIT_FIELD[metric]] ?? 0) : null;
      const override = overrides.find((o) => o.kind === 'LIMIT' && o.key === metric) ?? null;
      const eff = effectiveLimit(planValue ?? 0, overrides, metric, now);
      return {
        key: metric,
        planValue,
        effective: plan || eff.overridden ? eff.value : null,
        overridden: eff.overridden,
        override: override && { id: override.id, active: isOverrideActive(override, now), ...overrideSummary(override) },
      };
    });

    const features = FEATURE_KEYS.map((feature) => {
      const planValue = plan ? Boolean(plan[PLAN_FEATURE_FIELD[feature]]) : null;
      const override = overrides.find((o) => o.kind === 'FEATURE' && o.key === feature) ?? null;
      const eff = effectiveFeature(planValue ?? false, overrides, feature, now);
      return {
        key: feature,
        planValue,
        effective: eff.enabled,
        overridden: eff.overridden,
        override: override && { id: override.id, active: isOverrideActive(override, now), ...overrideSummary(override) },
      };
    });

    return { planName: plan?.name ?? null, limits, features };
  }
}

@Injectable()
export class SetEntitlementOverrideUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly overrideRepo: EntitlementOverrideRepository,
    private readonly overrideService: EntitlementOverrideService,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(orgId: string, dto: SetEntitlementOverrideDto, actor: AuditActor, meta: RequestMeta) {
    if (!(await this.platformRepo.findOrgBasics(orgId))) throw new NotFoundException('Organization not found');

    if (dto.kind === EntitlementKind.LIMIT && !(dto.key in PLAN_LIMIT_FIELD)) {
      throw new BadRequestException(`Unknown limit "${dto.key}"`);
    }
    if (dto.kind === EntitlementKind.FEATURE && !(FEATURE_KEYS as readonly string[]).includes(dto.key)) {
      throw new BadRequestException(`Unknown feature "${dto.key}"`);
    }
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && expiresAt <= new Date()) throw new BadRequestException('Expiry must be in the future');

    const before = await this.overrideRepo.findOne(orgId, dto.kind, dto.key);
    const saved = await this.overrideRepo.upsert({
      orgId,
      kind: dto.kind,
      key: dto.key,
      limitValue: dto.kind === EntitlementKind.LIMIT ? dto.limitValue! : null,
      enabled: dto.kind === EntitlementKind.FEATURE ? dto.enabled! : null,
      reason: dto.reason,
      expiresAt,
      createdById: actor.id,
    });
    this.overrideService.invalidate(orgId);

    await this.audit.record({
      action: PlatformAuditAction.ENTITLEMENT_OVERRIDE_SET,
      actor,
      targetType: 'Organization',
      targetId: orgId,
      orgId,
      metadata: {
        kind: dto.kind,
        key: dto.key,
        reason: dto.reason,
        before: overrideSummary(before),
        after: overrideSummary(saved),
      },
      meta,
    });
    return saved;
  }
}

@Injectable()
export class RemoveEntitlementOverrideUseCase {
  constructor(
    private readonly overrideRepo: EntitlementOverrideRepository,
    private readonly overrideService: EntitlementOverrideService,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(orgId: string, overrideId: string, actor: AuditActor, meta: RequestMeta): Promise<void> {
    const existing = await this.overrideRepo.findById(overrideId);
    if (!existing || existing.orgId !== orgId) throw new NotFoundException('Override not found');

    await this.overrideRepo.delete(overrideId);
    this.overrideService.invalidate(orgId);

    await this.audit.record({
      action: PlatformAuditAction.ENTITLEMENT_OVERRIDE_REMOVED,
      actor,
      targetType: 'Organization',
      targetId: orgId,
      orgId,
      metadata: { kind: existing.kind, key: existing.key, before: overrideSummary(existing), after: null },
      meta,
    });
  }
}
