import { Injectable, NotFoundException } from '@nestjs/common';
import { SlaRepository } from '../../infrastructure/repositories/sla.repository';

@Injectable()
export class GetSlaPolicyUseCase {
  constructor(private readonly slaRepo: SlaRepository) {}

  async execute(orgId: string, policyId: string) {
    const policy = await this.slaRepo.findPolicyById(policyId, orgId);
    if (!policy) {
      throw new NotFoundException('SLA policy not found');
    }
    return policy;
  }
}
