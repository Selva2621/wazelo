import { Injectable, Logger } from '@nestjs/common';
import { OrgType, UsageMetricType } from '@prisma/client';
import { OrgRepository } from '../../infrastructure/repositories/org.repository';
import { OrgOnboardingRepository } from '../../infrastructure/repositories/org-onboarding.repository';
import { RbacService } from '@/modules/rbac/domain/services/rbac.service';
import { OrgAiMemoryService } from '../../domain/services/org-ai-memory.service';
import {
  DEFAULT_CANNED_RESPONSES,
  DEFAULT_LEAD_SCORING_RULES,
  DEFAULT_PIPELINE,
  DEFAULT_SLA_POLICIES,
  DEFAULT_TAGS,
} from '@/shared/constants/org-defaults';
import {
  FREELANCER_SYSTEM_TEMPLATES,
  SHOPIFY_SYSTEM_TEMPLATES,
  SystemTemplate,
} from '@/shared/constants/system-templates';

/**
 * - signup           — new org: full onboarding including the free trial
 * - backfill         — pre-existing org: full onboarding WITHOUT the trial
 * - org-type-changed — only (re)check system templates for the new orgType
 */
export type OnboardingMode = 'signup' | 'backfill' | 'org-type-changed';

/**
 * Seeds everything an org needs to work out of the box:
 * trial subscription, RBAC permissions, AI memory, default pipeline,
 * tags, canned responses, lead scoring rules, SLA policies and system templates.
 *
 * Runs from the ORG_ONBOARDING queue (jobs/org/org-onboarding.worker.ts), so a
 * failure throws and pg-boss retries. Safe to re-run:
 *   - full onboarding runs once per org — Organization.onboardedAt marks it done
 *   - each step only creates what the org has never had (soft-deleted rows count),
 *     so a retry after a partial failure never duplicates data, and nothing an
 *     admin deleted is brought back
 *   - existing rows are never updated or deleted
 */
@Injectable()
export class OnboardOrgUseCase {
  private readonly logger = new Logger(OnboardOrgUseCase.name);

  constructor(
    private readonly orgRepository: OrgRepository,
    private readonly onboardingRepository: OrgOnboardingRepository,
    private readonly rbacService: RbacService,
    private readonly orgAiMemory: OrgAiMemoryService,
  ) {}

  async execute(orgId: string, mode: OnboardingMode): Promise<void> {
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      this.logger.warn(`Onboarding skipped: org ${orgId} not found`);
      return;
    }

    if (mode === 'org-type-changed') {
      await this.seedSystemTemplates(orgId, org.orgType);
      return;
    }

    if (org.onboardedAt) {
      this.logger.debug(`Org ${orgId} already onboarded — skipping`);
      return;
    }

    // Trials are only for brand-new signups — never hand one to an existing org
    if (mode === 'signup') {
      await this.assignTrial(orgId, org.trialUsedAt);
    }

    await this.rbacService.seedDefaultPermissionsForOrg(orgId);
    await this.initAiMemory(orgId);
    await this.seedPipeline(orgId);
    await this.seedTags(orgId);
    await this.seedLeadScoringRules(orgId);
    await this.seedSystemTemplates(orgId, org.orgType);

    const adminId = await this.onboardingRepository.findFirstAdminId(orgId);
    if (adminId) {
      await this.seedCannedResponses(orgId, adminId);
      await this.seedSlaPolicies(orgId, adminId, org.timezone);
    } else {
      this.logger.warn(`Org ${orgId} has no admin — skipped canned responses and SLA policies`);
    }

    await this.onboardingRepository.markOnboarded(orgId);
    this.logger.log(`Onboarding (${mode}) complete for org ${orgId}`);
  }

  private async assignTrial(orgId: string, trialUsedAt: Date | null): Promise<void> {
    if (trialUsedAt || (await this.onboardingRepository.hasAnySubscription(orgId))) return;

    const plan = await this.onboardingRepository.findDefaultTrialPlan();
    if (!plan || plan.trialDays <= 0) {
      this.logger.warn(`No default trial plan configured — org ${orgId} starts without a trial`);
      return;
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);

    await this.onboardingRepository.createTrialSubscription({
      orgId,
      plan,
      startsAt,
      endsAt,
      usageLimits: {
        [UsageMetricType.MESSAGES_SENT]: plan.maxMessagesPerMonth,
        [UsageMetricType.ACTIVE_USERS]: plan.maxUsers,
        [UsageMetricType.WHATSAPP_SESSIONS]: plan.maxWhatsappSessions,
        [UsageMetricType.CAMPAIGN_EXECUTIONS]: plan.maxCampaignsPerMonth,
        [UsageMetricType.API_CALLS]: plan.maxApiCallsPerMonth,
      } as Record<UsageMetricType, number>,
    });
    this.logger.log(`Assigned ${plan.trialDays}-day trial to org ${orgId}`);
  }

  /** Only when missing — rebuild() may call the AI provider. */
  private async initAiMemory(orgId: string): Promise<void> {
    if (await this.onboardingRepository.hasAiMemory(orgId)) return;
    await this.orgAiMemory.rebuild(orgId);
  }

  private async seedPipeline(orgId: string): Promise<void> {
    if (await this.onboardingRepository.hasAnyPipeline(orgId)) return;
    await this.onboardingRepository.createDefaultPipeline(orgId, DEFAULT_PIPELINE);
  }

  private async seedTags(orgId: string): Promise<void> {
    if (await this.onboardingRepository.hasAnyTag(orgId)) return;
    await this.onboardingRepository.createTags(orgId, DEFAULT_TAGS);
  }

  private async seedCannedResponses(orgId: string, adminId: string): Promise<void> {
    if (await this.onboardingRepository.hasAnyCannedResponse(orgId)) return;
    await this.onboardingRepository.createCannedResponses(orgId, adminId, DEFAULT_CANNED_RESPONSES);
  }

  private async seedLeadScoringRules(orgId: string): Promise<void> {
    if (await this.onboardingRepository.hasAnyLeadScoringRule(orgId)) return;
    await this.onboardingRepository.createLeadScoringRules(orgId, DEFAULT_LEAD_SCORING_RULES);
  }

  private async seedSlaPolicies(orgId: string, adminId: string, timezone: string): Promise<void> {
    if (await this.onboardingRepository.hasAnySlaPolicy(orgId)) return;
    await this.onboardingRepository.createSlaPolicies(orgId, adminId, timezone, DEFAULT_SLA_POLICIES);
  }

  private async seedSystemTemplates(orgId: string, orgType: OrgType): Promise<void> {
    const templates: SystemTemplate[] = [
      ...SHOPIFY_SYSTEM_TEMPLATES,
      ...(orgType === OrgType.FREELANCER ? FREELANCER_SYSTEM_TEMPLATES : []),
    ];

    const existing = await this.onboardingRepository.findTemplateNames(
      orgId,
      templates.map((t) => t.name),
    );
    const missing = templates.filter((t) => !existing.has(t.name));
    if (missing.length === 0) return;

    await this.onboardingRepository.createSystemTemplates(orgId, missing);
  }
}
