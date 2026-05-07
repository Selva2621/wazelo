import { Injectable, NotFoundException } from '@nestjs/common';
import { AutomationRepository } from '../../infrastructure/repositories/automation.repository';

@Injectable()
export class GetAutomationRuleUseCase {
  constructor(private readonly automationRepo: AutomationRepository) {}

  async execute(ruleId: string, orgId: string) {
    const rule = await this.automationRepo.findRuleByIdAndOrg(ruleId, orgId);
    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }
    return rule;
  }
}
