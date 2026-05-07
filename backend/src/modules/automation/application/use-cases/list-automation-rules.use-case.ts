import { Injectable } from '@nestjs/common';
import { AutomationRepository } from '../../infrastructure/repositories/automation.repository';
import { ListAutomationRulesDto } from '../dto';

@Injectable()
export class ListAutomationRulesUseCase {
  constructor(private readonly automationRepo: AutomationRepository) {}

  async execute(orgId: string, dto: ListAutomationRulesDto) {
    return this.automationRepo.listRules({
      orgId,
      triggerType: dto.triggerType,
      status: dto.status,
      limit: dto.limit ?? 20,
      offset: dto.offset ?? 0,
    });
  }
}
