import { Module } from '@nestjs/common';
import { CampaignsModule } from '@/modules/campaigns/campaigns.module';
import { SequenceRepository } from './infrastructure/repositories/sequence.repository';
import { SequenceTemplateRepository } from './infrastructure/repositories/sequence-template.repository';
import { SequencesController } from './interfaces/controllers/sequences.controller';
import { EnrollContactUseCase } from './application/use-cases/enroll-contact.use-case';
import { GenerateSequenceUseCase } from './application/use-cases/generate-sequence.use-case';
import { AiModule } from '@/modules/ai/ai.module';
import { BillingModule } from '@/modules/billing/billing.module';

@Module({
  // AiModule: the AI provider for drafting; BillingModule: the @AiCredits guard and charge
  imports: [CampaignsModule, AiModule, BillingModule],
  controllers: [SequencesController],
  providers: [SequenceRepository, SequenceTemplateRepository, EnrollContactUseCase, GenerateSequenceUseCase],
  exports: [SequenceRepository, SequenceTemplateRepository, EnrollContactUseCase],
})
export class SequencesModule {}
