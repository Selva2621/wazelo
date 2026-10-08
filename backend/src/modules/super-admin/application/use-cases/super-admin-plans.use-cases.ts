import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformAuditAction } from '@prisma/client';
import { CreatePlanUseCase } from '@/modules/billing/application/use-cases/create-plan.use-case';
import { UpdatePlanUseCase } from '@/modules/billing/application/use-cases/update-plan.use-case';
import { PlanRepository } from '@/modules/billing/infrastructure/repositories/plan.repository';
import { CreatePlanDto } from '@/modules/billing/application/dto/create-plan.dto';
import { UpdatePlanDto } from '@/modules/billing/application/dto/update-plan.dto';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';
import { diffChanges } from '../../domain/services/audit-diff';

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

/** Plan update by a super admin, recorded with only the fields that changed. */
@Injectable()
export class SuperAdminUpdatePlanUseCase {
  constructor(
    private readonly updatePlan: UpdatePlanUseCase,
    private readonly planRepo: PlanRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(actor: AuditActor, planId: string, dto: UpdatePlanDto, meta: RequestMeta) {
    const before = await this.planRepo.findById(planId);
    if (!before) throw new NotFoundException('Plan not found');

    const result = await this.updatePlan.execute(planId, actor.id, dto);
    const diff = diffChanges(before as unknown as Record<string, unknown>, { ...dto });

    await this.audit.record({
      action: PlatformAuditAction.PLAN_UPDATED,
      actor,
      targetType: 'Plan',
      targetId: planId,
      metadata: { planName: before.name, ...diff },
      meta,
    });
    return result;
  }
}
