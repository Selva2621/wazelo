import { Module } from '@nestjs/common';
import { AiModule } from '@/modules/ai/ai.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { KbRepository } from './infrastructure/repositories/kb.repository';
import { DocumentProcessorService } from './domain/services/document-processor.service';
import { KbController, KbPublicController } from './interfaces/controllers/kb.controller';
import { KbSourceRepository } from './infrastructure/repositories/kb-source.repository';
import { KbIndexService } from './application/services/kb-index.service';
import {
  AddWebsiteSourceUseCase,
  ManageWebsiteSourcesUseCase,
  ProcessWebsiteSourceUseCase,
  ResyncWebsiteSourceUseCase,
  ResyncDueWebsitesUseCase,
} from './application/use-cases/kb-sources.use-cases';
import { KbFaqsUseCase } from './application/use-cases/kb-faqs.use-cases';
import { KbUnansweredUseCase } from './application/use-cases/kb-unanswered.use-cases';

@Module({
  // BillingModule: AI credits for article tag suggestions and website learning
  // AuditModule: @Audited on knowledge changes (what the AI assistant answers from)
  imports: [AiModule, BillingModule, AuditModule],
  controllers: [KbController, KbPublicController],
  providers: [
    KbRepository,
    DocumentProcessorService,
    KbSourceRepository,
    // KbChunkRepository comes from AiModule (KbAnswerService searches it)
    KbIndexService,
    AddWebsiteSourceUseCase,
    ResyncWebsiteSourceUseCase,
    ManageWebsiteSourcesUseCase,
    ProcessWebsiteSourceUseCase,
    ResyncDueWebsitesUseCase,
    KbFaqsUseCase,
    KbUnansweredUseCase,
  ],
  exports: [
    KbRepository,
    DocumentProcessorService,
    // Website crawl worker (jobs module)
    KbSourceRepository,
    ProcessWebsiteSourceUseCase,
    ResyncDueWebsitesUseCase,
  ],
})
export class KnowledgeBaseModule {}
