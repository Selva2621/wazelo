import { Injectable } from '@nestjs/common';
import { AutomationRepository } from '../../infrastructure/repositories/automation.repository';
import { ListExecutionLogsDto } from '../dto';

@Injectable()
export class ListExecutionLogsUseCase {
  constructor(private readonly automationRepo: AutomationRepository) {}

  async execute(orgId: string, dto: ListExecutionLogsDto) {
    return this.automationRepo.listExecutionLogs({
      orgId,
      ruleId: dto.ruleId,
      status: dto.status,
      limit: dto.limit ?? 20,
      offset: dto.offset ?? 0,
    });
  }
}
