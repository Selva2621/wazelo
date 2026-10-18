import { Module } from '@nestjs/common';
import { AiModule } from '@/modules/ai/ai.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { PipelineRepository } from './infrastructure/repositories/pipeline.repository';
import { DealRepository } from './infrastructure/repositories/deal.repository';
import { DealsController } from './interfaces/controllers/deals.controller';
import { ScoreDealUseCase } from './application/use-cases/score-deal.use-case';
import { DealGuardUseCase } from './application/use-cases/deal-guard.use-case';
import { DealAccessUseCase } from './application/use-cases/deal-access.use-case';
import { DealLifecycleUseCase } from './application/use-cases/deal-lifecycle.use-case';
import { TeamsModule } from '@/modules/teams/teams.module';

@Module({
  imports: [AiModule, BillingModule, MessagesModule, TeamsModule],
  controllers: [DealsController],
  providers: [
    PipelineRepository,
    DealRepository,
    ScoreDealUseCase,
    DealGuardUseCase,
    DealAccessUseCase,
    DealLifecycleUseCase,
  ],
  exports: [PipelineRepository, DealRepository, DealGuardUseCase, DealLifecycleUseCase],
})
export class DealsModule {}
