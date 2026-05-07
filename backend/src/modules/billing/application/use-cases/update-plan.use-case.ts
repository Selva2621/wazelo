import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction } from '@prisma/client';

@Injectable()
export class UpdatePlanUseCase {
  private readonly logger = new Logger(UpdatePlanUseCase.name);

  constructor(
    private readonly planRepo: PlanRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    planId: string,
    userId: string,
    dto: UpdatePlanDto,
    ipAddress: string,
    userAgent: string,
  ) {
    const plan = await this.planRepo.findById(planId);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Changes only apply to new subscriptions (existing subscriptions keep their locked-in plan).
    // We update the plan record in place since plan is versioned.
    const updated = await this.planRepo.update(planId, dto);

    this.eventEmitter.emit(EVENT_NAMES.PLAN_UPDATED, {
      planId: updated.id,
      name: updated.name,
      userId,
      changes: dto,
    });

    await this.auditService.log({
      userId,
      action: AuditAction.PLAN_UPDATED,
      targetType: 'Plan',
      targetId: planId,
      metadata: { changes: dto },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Plan ${planId} updated by user ${userId}`);
    return { plan: updated };
  }
}
