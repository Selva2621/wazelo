import { Injectable } from '@nestjs/common';
import { PlanRepository } from '../../infrastructure/repositories/plan.repository';

@Injectable()
export class ListPlansUseCase {
  constructor(private readonly planRepo: PlanRepository) {}

  async execute() {
    const plans = await this.planRepo.findAllActive();
    return { plans };
  }
}
