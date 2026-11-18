import { Module } from '@nestjs/common';
import { LeadFollowUpRepository } from './infrastructure/repositories/lead-follow-up.repository';
import {
  AssignLeadUseCase,
  ListMyLeadsUseCase,
  RemindDueLeadsUseCase,
  SendDailySummariesUseCase,
  TouchLeadUseCase,
} from './application/use-cases/lead-follow-up.use-cases';
import { LeadFollowUpsController } from './interfaces/controllers/lead-follow-ups.controller';

/** Who must contact each lead, by when, and whether they did */
@Module({
  controllers: [LeadFollowUpsController],
  providers: [
    LeadFollowUpRepository,
    AssignLeadUseCase,
    TouchLeadUseCase,
    ListMyLeadsUseCase,
    RemindDueLeadsUseCase,
    SendDailySummariesUseCase,
  ],
  exports: [AssignLeadUseCase, TouchLeadUseCase, RemindDueLeadsUseCase, SendDailySummariesUseCase],
})
export class LeadFollowUpsModule {}
