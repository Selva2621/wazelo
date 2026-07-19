import { Module } from '@nestjs/common';
import { ContactsModule } from '@/modules/contacts/contacts.module';
import { QueueModule } from '@/infrastructure/queue/queue.module';
import { WhatsAppModule } from '@/modules/whatsapp/whatsapp.module';

// Infrastructure
import { ScrapeRunRepository } from './infrastructure/repositories/scrape-run.repository';

// Domain
import { ScraperFactory } from './domain/scrapers/scraper.factory';

// Use Cases
import { TriggerScrapeRunUseCase } from './application/use-cases/trigger-scrape-run.use-case';
import { ProcessScrapeRunUseCase } from './application/use-cases/process-scrape-run.use-case';
import { ListScrapeRunsUseCase } from './application/use-cases/list-scrape-runs.use-case';
import { ImportScrapeResultsUseCase } from './application/use-cases/import-scrape-results.use-case';
import { CheckWhatsAppUseCase } from './application/use-cases/check-whatsapp.use-case';

// Controllers
import { LeadScraperController } from './interfaces/controllers/lead-scraper.controller';

@Module({
  imports: [ContactsModule, QueueModule, WhatsAppModule],
  providers: [
    ScrapeRunRepository,
    ScraperFactory,
    TriggerScrapeRunUseCase,
    ProcessScrapeRunUseCase,
    ListScrapeRunsUseCase,
    ImportScrapeResultsUseCase,
    CheckWhatsAppUseCase,
  ],
  controllers: [LeadScraperController],
  exports: [ProcessScrapeRunUseCase],
})
export class LeadScraperModule {}
