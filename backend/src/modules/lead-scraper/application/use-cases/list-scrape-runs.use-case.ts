import { Injectable } from '@nestjs/common';
import { ScrapeRun, ScrapeRunStatus, ScrapeSource } from '@prisma/client';
import { ScrapeRunRepository } from '../../infrastructure/repositories/scrape-run.repository';

@Injectable()
export class ListScrapeRunsUseCase {
  constructor(private readonly scrapeRunRepository: ScrapeRunRepository) {}

  async execute(
    orgId: string,
    options?: { skip?: number; take?: number; status?: ScrapeRunStatus; source?: ScrapeSource },
  ): Promise<{ runs: ScrapeRun[]; total: number }> {
    return this.scrapeRunRepository.findByOrg(orgId, options);
  }
}
