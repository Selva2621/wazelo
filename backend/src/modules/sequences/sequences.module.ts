import { Module } from '@nestjs/common';
import { CampaignsModule } from '@/modules/campaigns/campaigns.module';
import { SequenceRepository } from './infrastructure/repositories/sequence.repository';
import { SequenceTemplateRepository } from './infrastructure/repositories/sequence-template.repository';
import { SequencesController } from './interfaces/controllers/sequences.controller';
import { EnrollContactUseCase } from './application/use-cases/enroll-contact.use-case';

@Module({
  imports: [CampaignsModule],
  controllers: [SequencesController],
  providers: [SequenceRepository, SequenceTemplateRepository, EnrollContactUseCase],
  exports: [SequenceRepository, SequenceTemplateRepository, EnrollContactUseCase],
})
export class SequencesModule {}
