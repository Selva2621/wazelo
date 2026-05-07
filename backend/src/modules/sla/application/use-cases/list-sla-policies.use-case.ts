import { Injectable } from '@nestjs/common';
import { SlaRepository } from '../../infrastructure/repositories/sla.repository';
import { ListSlaPoliciesQueryDto } from '../dto/sla-query.dto';

@Injectable()
export class ListSlaPoliciesUseCase {
  constructor(private readonly slaRepo: SlaRepository) {}

  async execute(orgId: string, query: ListSlaPoliciesQueryDto) {
    return this.slaRepo.listPolicies(orgId, {
      isActive: query.isActive,
      metricType: query.metricType,
      priority: query.priority,
    });
  }
}
