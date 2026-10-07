import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Plan, Prisma, SlaMetricType, UsageMetricType, UserRole } from '@prisma/client';
import { DefaultPipelineStage } from '@/shared/constants/org-defaults';
import { SystemTemplate } from '@/shared/constants/system-templates';

/**
 * Persistence for org onboarding (default master data).
 * Pure reads/writes — the "seed only if missing" decisions live in OnboardOrgUseCase.
 *
 * The hasAny* checks deliberately include soft-deleted rows: if an org ever had
 * a record of that kind, an admin removing it must not bring the defaults back.
 */
@Injectable()
export class OrgOnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ───── Org ─────

  async findFirstAdminId(orgId: string): Promise<string | null> {
    const admin = await this.prisma.user.findFirst({
      where: { orgId, role: UserRole.ADMIN, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return admin?.id ?? null;
  }

  async markOnboarded(orgId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { onboardedAt: new Date() },
    });
  }

  // ───── Trial ─────

  async hasAnySubscription(orgId: string): Promise<boolean> {
    const count = await this.prisma.subscription.count({ where: { orgId } });
    return count > 0;
  }

  async findDefaultTrialPlan(): Promise<Plan | null> {
    return this.prisma.plan.findFirst({
      where: { isDefault: true, isActive: true, deletedAt: null },
    });
  }

  async createTrialSubscription(input: {
    orgId: string;
    plan: Plan;
    startsAt: Date;
    endsAt: Date;
    usageLimits: Record<UsageMetricType, number>;
  }): Promise<void> {
    const { orgId, plan, startsAt, endsAt, usageLimits } = input;

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.create({
        data: {
          orgId,
          planId: plan.id,
          status: 'TRIAL',
          billingCycle: plan.billingCycle,
          priceInCents: 0,
          currency: plan.currency,
          trialEndsAt: endsAt,
          currentPeriodStart: startsAt,
          currentPeriodEnd: endsAt,
        },
      });

      await tx.organization.update({
        where: { id: orgId },
        data: { trialUsedAt: startsAt },
      });

      await tx.usageRecord.createMany({
        data: Object.entries(usageLimits).map(([metricType, limitValue]) => ({
          orgId,
          metricType: metricType as UsageMetricType,
          currentValue: 0,
          limitValue,
          periodStart: startsAt,
          periodEnd: endsAt,
        })),
      });
    });
  }

  // ───── AI memory ─────

  async hasAiMemory(orgId: string): Promise<boolean> {
    const count = await this.prisma.orgAiMemory.count({ where: { orgId } });
    return count > 0;
  }

  // ───── Pipeline ─────

  async hasAnyPipeline(orgId: string): Promise<boolean> {
    return (await this.prisma.pipeline.count({ where: { orgId } })) > 0;
  }

  async createDefaultPipeline(
    orgId: string,
    data: { name: string; description: string; stages: DefaultPipelineStage[] },
  ): Promise<void> {
    await this.prisma.pipeline.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        isDefault: true,
        stages: {
          create: data.stages.map((s) => ({
            name: s.name,
            order: s.order,
            color: s.color,
            isWonStage: s.isWonStage ?? false,
            isLostStage: s.isLostStage ?? false,
          })),
        },
      },
    });
  }

  // ───── Tags ─────

  async hasAnyTag(orgId: string): Promise<boolean> {
    return (await this.prisma.tag.count({ where: { orgId } })) > 0;
  }

  async createTags(orgId: string, tags: { name: string; color: string }[]): Promise<void> {
    await this.prisma.tag.createMany({
      data: tags.map((t) => ({ orgId, name: t.name, color: t.color })),
    });
  }

  // ───── Canned responses ─────

  async hasAnyCannedResponse(orgId: string): Promise<boolean> {
    return (await this.prisma.cannedResponse.count({ where: { orgId } })) > 0;
  }

  async createCannedResponses(
    orgId: string,
    createdById: string,
    responses: { title: string; shortcut: string; category: string; content: string }[],
  ): Promise<void> {
    await this.prisma.cannedResponse.createMany({
      data: responses.map((r) => ({ orgId, createdById, ...r })),
    });
  }

  // ───── Lead scoring ─────

  /**
   * Rules are hard-deleted, so score history linked to a rule is the
   * evidence that an org once had (and removed) its rules.
   */
  async hasAnyLeadScoringRule(orgId: string): Promise<boolean> {
    const [rules, ruleHistory] = await Promise.all([
      this.prisma.leadScoringRule.count({ where: { orgId } }),
      this.prisma.contactScoreHistory.count({ where: { orgId, ruleId: { not: null } } }),
    ]);
    return rules > 0 || ruleHistory > 0;
  }

  async createLeadScoringRules(
    orgId: string,
    rules: {
      name: string;
      description: string;
      signal: string;
      condition?: Record<string, unknown>;
      points: number;
      maxPerContact: number;
    }[],
  ): Promise<void> {
    await this.prisma.leadScoringRule.createMany({
      data: rules.map((r) => ({
        orgId,
        name: r.name,
        description: r.description,
        signal: r.signal,
        condition: (r.condition ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        points: r.points,
        maxPerContact: r.maxPerContact,
      })),
    });
  }

  // ───── SLA ─────

  async hasAnySlaPolicy(orgId: string): Promise<boolean> {
    return (await this.prisma.slaPolicy.count({ where: { orgId } })) > 0;
  }

  async createSlaPolicies(
    orgId: string,
    createdById: string,
    timezone: string,
    policies: {
      name: string;
      description: string;
      metricType: SlaMetricType;
      thresholdMs: number;
      warningThresholdMs: number;
    }[],
  ): Promise<void> {
    await this.prisma.slaPolicy.createMany({
      data: policies.map((p) => ({
        orgId,
        createdById,
        timezone,
        name: p.name,
        description: p.description,
        metricType: p.metricType,
        thresholdMs: p.thresholdMs,
        warningThresholdMs: p.warningThresholdMs,
        isActive: false,
      })),
    });
  }

  // ───── Message templates ─────

  /** Includes soft-deleted templates so a deleted system template is never recreated. */
  async findTemplateNames(orgId: string, names: string[]): Promise<Set<string>> {
    const rows = await this.prisma.messageTemplate.findMany({
      where: { orgId, name: { in: names } },
      select: { name: true },
    });
    return new Set(rows.map((r) => r.name));
  }

  async createSystemTemplates(orgId: string, templates: SystemTemplate[]): Promise<void> {
    await this.prisma.messageTemplate.createMany({
      data: templates.map((t) => ({
        orgId,
        channelId: null,
        name: t.name,
        language: t.language,
        category: t.category,
        status: 'PENDING',
        whatsappTemplateId: null,
        components: [{ type: 'BODY', text: t.body }],
        exampleValues: { isSystemTemplate: true, ...t.meta },
      })),
    });
  }
}
