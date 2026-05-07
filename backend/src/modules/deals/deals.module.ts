import { Module } from '@nestjs/common';
import { AiModule } from '@/modules/ai/ai.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { PipelineRepository } from './infrastructure/repositories/pipeline.repository';
import { DealRepository } from './infrastructure/repositories/deal.repository';
import { DealsController } from './interfaces/controllers/deals.controller';
import { ScoreDealUseCase } from './application/use-cases/score-deal.use-case';

@Module({
  imports: [AiModule, BillingModule],
  controllers: [DealsController],
  providers: [PipelineRepository, DealRepository, ScoreDealUseCase],
  exports: [PipelineRepository, DealRepository],
})
export class DealsModule {}
