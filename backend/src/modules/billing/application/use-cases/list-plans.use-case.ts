import { Injectable } from '@nestjs/common';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';

@Injectable()
export class ListPlansUseCase {
  constructor(private readonly planRepo: PlanRepository) {}

  /** Tenants see active plans only; the super admin also sees inactive ones to reactivate them. */
  async execute(options: { includeInactive?: boolean } = {}) {
    const plans = options.includeInactive
      ? await this.planRepo.findAllForAdmin()
      : await this.planRepo.findAllActive();
    return { plans };
  }
}
