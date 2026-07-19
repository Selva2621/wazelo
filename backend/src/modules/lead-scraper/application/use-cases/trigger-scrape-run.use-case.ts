import { Injectable } from '@nestjs/common';
import { ScrapeRun } from '@prisma/client';
import { ScrapeRunRepository } from '../../infrastructure/repositories/scrape-run.repository';
import { TriggerScrapeDto } from '../dto/trigger-scrape.dto';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';

@Injectable()
export class TriggerScrapeRunUseCase {
  constructor(
    private readonly scrapeRunRepository: ScrapeRunRepository,
    private readonly queueService: QueueService,
  ) {}

  async execute(orgId: string, userId: string, dto: TriggerScrapeDto): Promise<ScrapeRun> {
    const run = await this.scrapeRunRepository.create({
      orgId,
      source: dto.source,
      keywords: dto.keywords,
      location: dto.location,
      maxResults: dto.maxResults ?? 50,
      createdById: userId,
    });

    await this.queueService.publish(
      QUEUE_NAMES.SCRAPE_LEADS,
      { scrapeRunId: run.id },
      { singletonKey: `scrape-${run.id}` },
    );

    return run;
  }
}
