import { Injectable, Logger } from '@nestjs/common';
import { ScrapeRunStatus } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ScrapeRunRepository } from '../../infrastructure/repositories/scrape-run.repository';
import { ScraperFactory } from '../../domain/scrapers/scraper.factory';

@Injectable()
export class ProcessScrapeRunUseCase {
  private readonly logger = new Logger(ProcessScrapeRunUseCase.name);

  constructor(
    private readonly scrapeRunRepository: ScrapeRunRepository,
    private readonly scraperFactory: ScraperFactory,
    private readonly prisma: PrismaService,
  ) {}

  async execute(scrapeRunId: string): Promise<void> {
    const run = await this.scrapeRunRepository.findById(scrapeRunId);
    if (!run) {
      this.logger.warn(`ScrapeRun ${scrapeRunId} not found`);
      return;
    }
    if (run.status === ScrapeRunStatus.COMPLETED || run.status === ScrapeRunStatus.FAILED) {
      return;
    }

    await this.scrapeRunRepository.update(scrapeRunId, { status: ScrapeRunStatus.RUNNING });

    try {
      const scraper = this.scraperFactory.getScraper(run.source);
      const leads = await scraper.scrape(run.keywords, run.location ?? undefined, run.maxResults);

      // Save all results to scrape_results table (no contact creation)
      if (leads.length > 0) {
        await this.prisma.scrapeResult.createMany({
          data: leads.map((lead) => ({
            scrapeRunId: run.id,
            orgId: run.orgId,
            name: lead.name ?? null,
            phone: lead.phone ?? null,
            email: lead.email ?? null,
            company: lead.company ?? null,
            jobTitle: lead.jobTitle ?? null,
            location: lead.location ?? null,
            address: lead.address ?? null,
            website: lead.website ?? null,
            budget: lead.budget ?? null,
            skills: lead.skills ?? [],
            rating: lead.rating ?? null,
            reviewCount: lead.reviewCount ?? null,
            category: lead.category ?? null,
            description: lead.description ?? null,
            openingHours: lead.openingHours ?? null,
            socialLinks: lead.socialLinks ?? [],
            sourceUrl: lead.sourceUrl,
          })),
        });
      }

      await this.scrapeRunRepository.update(scrapeRunId, {
        status: ScrapeRunStatus.COMPLETED,
        resultCount: leads.length,
        completedAt: new Date(),
      });

      this.logger.log(`ScrapeRun ${scrapeRunId} completed: ${leads.length} results saved`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`ScrapeRun ${scrapeRunId} failed: ${errorMessage}`);
      await this.scrapeRunRepository.update(scrapeRunId, {
        status: ScrapeRunStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      });
    }
  }
}
