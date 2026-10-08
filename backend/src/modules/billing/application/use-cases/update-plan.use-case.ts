import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { EVENT_NAMES } from '@/common/constants';

/**
 * Plans are platform-wide and managed only by super admins (via the
 * super-admin module, which also writes the platform audit entry).
 */
@Injectable()
export class UpdatePlanUseCase {
  private readonly logger = new Logger(UpdatePlanUseCase.name);

  constructor(
    private readonly planRepo: PlanRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** `superAdminId` is a SuperAdmin id, not a User id. */
  async execute(planId: string, superAdminId: string, dto: UpdatePlanDto) {
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
      superAdminId,
      changes: dto,
    });

    this.logger.log(`Plan ${planId} updated by super admin ${superAdminId}`);
    return { plan: updated };
  }
}
