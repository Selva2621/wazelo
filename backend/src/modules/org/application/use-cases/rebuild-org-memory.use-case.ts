import { Injectable } from '@nestjs/common';
import { OrgAiMemoryService } from '../../domain/services/org-ai-memory.service';

@Injectable()
export class RebuildOrgMemoryUseCase {
  constructor(private readonly orgAiMemory: OrgAiMemoryService) {}

  async execute(orgId: string): Promise<void> {
    await this.orgAiMemory.rebuild(orgId);
  }
}
