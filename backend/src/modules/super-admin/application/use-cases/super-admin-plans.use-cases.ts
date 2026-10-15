import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Plan, PlatformAuditAction } from '@prisma/client';
import { CreatePlanUseCase } from '@/modules/billing/application/use-cases/create-plan.use-case';
import { UpdatePlanUseCase } from '@/modules/billing/application/use-cases/update-plan.use-case';
import { PlanRepository } from '@/modules/billing/infrastructure/repositories/plan.repository';
import { CreatePlanDto } from '@/modules/billing/application/dto/create-plan.dto';
import { UpdatePlanDto } from '@/modules/billing/application/dto/update-plan.dto';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';
import { diffChanges } from '../../domain/services/audit-diff';
import { subscriberAffectingChanges } from '../../domain/services/plan-edit';
import { archivedPlanEditBlocker, planDeletionBlocker } from '../../domain/services/plan-lifecycle';
import { PlanEditMode } from '../dto/super-admin-plan.dto';

/** Plan creation by a super admin, recorded in the platform audit log. */
@Injectable()
export class SuperAdminCreatePlanUseCase {
  constructor(
    private readonly createPlan: CreatePlanUseCase,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(actor: AuditActor, dto: CreatePlanDto, meta: RequestMeta) {
    const result = await this.createPlan.execute(actor.id, dto);
    await this.audit.record({
      action: PlatformAuditAction.PLAN_CREATED,
      actor,
      targetType: 'Plan',
      targetId: result.plan.id,
      metadata: { planName: result.plan.name, after: { ...dto } },
      meta,
    });
    return result;
  }
}

/**
 * Every plan (archived ones included, with archivedAt — the UI hides them behind a toggle)
 * with how many live subscriptions it has — the UI asks how to apply edits when > 0.
 */
@Injectable()
export class SuperAdminListPlansUseCase {
  constructor(private readonly planRepo: PlanRepository) {}

  async execute() {
    const plans = await this.planRepo.findAllForAdmin();
    const counts = await this.planRepo.countLiveSubscribers(plans.map((p) => p.id));
    return { plans: plans.map((p) => ({ ...p, liveSubscribers: counts.get(p.id) ?? 0 })) };
  }
}

/**
 * Plan update by a super admin. When an edit changes limits/features of a plan that has
 * live subscribers, the admin must choose:
 * - `apply_to_all`: edit in place; every subscriber gets the new limits/features at once.
 * - `new_version`: publish a new version for new sign-ups; existing subscribers keep theirs.
 * Prices are locked per subscription either way, so neither mode re-prices anyone.
 */
@Injectable()
export class SuperAdminUpdatePlanUseCase {
  constructor(
    private readonly updatePlan: UpdatePlanUseCase,
    private readonly planRepo: PlanRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(actor: AuditActor, planId: string, dto: UpdatePlanDto, mode: PlanEditMode | undefined, meta: RequestMeta) {
    const before = await this.planRepo.findById(planId);
    if (!before) throw new NotFoundException('Plan not found');
    const blocked = archivedPlanEditBlocker(before, dto);
    if (blocked) throw new BadRequestException(blocked);

    const diff = diffChanges(before as unknown as Record<string, unknown>, { ...dto });
    const affecting = subscriberAffectingChanges(diff);
    const subscribers = (await this.planRepo.countLiveSubscribers([planId])).get(planId) ?? 0;
    // A choice only matters when limits/features change for people already on the plan
    const choiceNeeded = subscribers > 0 && affecting.length > 0;
    if (choiceNeeded && !mode) {
      throw new BadRequestException(
        `This plan has ${subscribers} live subscriber${subscribers === 1 ? '' : 's'}. ` +
          'Choose whether to apply the change to them or publish a new version.',
      );
    }

    if (choiceNeeded && mode === 'new_version') {
      if (!before.isActive) {
        throw new BadRequestException('This version is retired — edit the current version instead');
      }
      const next = await this.planRepo.createNextVersion(before, dto as Partial<Plan>);
      await this.audit.record({
        action: PlatformAuditAction.PLAN_UPDATED,
        actor,
        targetType: 'Plan',
        targetId: next.id,
        metadata: {
          planName: before.name,
          mode,
          previousPlanId: before.id,
          previousVersion: before.version,
          newVersion: next.version,
          subscribersKeptOnPrevious: subscribers,
          ...diff,
        },
        meta,
      });
      return { plan: next, mode, subscribersAffected: 0 };
    }

    const result = await this.updatePlan.execute(planId, actor.id, dto);
    await this.audit.record({
      action: PlatformAuditAction.PLAN_UPDATED,
      actor,
      targetType: 'Plan',
      targetId: planId,
      metadata: {
        planName: before.name,
        ...(choiceNeeded && { mode: 'apply_to_all', subscribersAffected: subscribers }),
        ...diff,
      },
      meta,
    });
    return { ...result, mode: 'apply_to_all' as const, subscribersAffected: choiceNeeded ? subscribers : 0 };
  }
}

/**
 * Takes a plan off sale and out of the default admin list. Not a delete: existing
 * subscriptions keep pointing at it and keep renewing with its limits and features.
 */
@Injectable()
export class SuperAdminArchivePlanUseCase {
  constructor(
    private readonly planRepo: PlanRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(actor: AuditActor, planId: string, meta: RequestMeta) {
    const plan = await this.planRepo.findById(planId);
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.archivedAt) return { plan };

    const archived = await this.planRepo.archive(planId);
    const subscribers = (await this.planRepo.countLiveSubscribers([planId])).get(planId) ?? 0;
    await this.audit.record({
      action: PlatformAuditAction.PLAN_ARCHIVED,
      actor,
      targetType: 'Plan',
      targetId: planId,
      metadata: {
        planName: plan.name,
        version: plan.version,
        subscribersKept: subscribers,
        before: { isActive: plan.isActive },
        after: { isActive: false },
      },
      meta,
    });
    return { plan: archived };
  }
}

/** Brings an archived plan back to the admin list. It stays inactive until activated. */
@Injectable()
export class SuperAdminUnarchivePlanUseCase {
  constructor(
    private readonly planRepo: PlanRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(actor: AuditActor, planId: string, meta: RequestMeta) {
    const plan = await this.planRepo.findById(planId);
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.archivedAt) return { plan };

    const restored = await this.planRepo.unarchive(planId);
    await this.audit.record({
      action: PlatformAuditAction.PLAN_UNARCHIVED,
      actor,
      targetType: 'Plan',
      targetId: planId,
      metadata: { planName: plan.name, version: plan.version, archivedAt: plan.archivedAt.toISOString() },
      meta,
    });
    return { plan: restored };
  }
}

/** Deletes a plan nobody has ever subscribed to; anything with history must be archived. */
@Injectable()
export class SuperAdminDeletePlanUseCase {
  constructor(
    private readonly planRepo: PlanRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(actor: AuditActor, planId: string, meta: RequestMeta): Promise<void> {
    const plan = await this.planRepo.findById(planId);
    if (!plan) throw new NotFoundException('Plan not found');

    const blocked = planDeletionBlocker(await this.planRepo.countSubscriptionHistory(planId));
    if (blocked) throw new BadRequestException(blocked);

    await this.planRepo.softDelete(planId);
    await this.audit.record({
      action: PlatformAuditAction.PLAN_DELETED,
      actor,
      targetType: 'Plan',
      targetId: planId,
      metadata: {
        planName: plan.name,
        before: { slug: plan.slug, billingCycle: plan.billingCycle, version: plan.version, isActive: plan.isActive },
      },
      meta,
    });
  }
}
