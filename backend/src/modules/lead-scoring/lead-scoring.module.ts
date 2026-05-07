import { Module } from '@nestjs/common';
import { LeadScoringRepository } from './infrastructure/repositories/lead-scoring.repository';
import { LeadScoringService } from './domain/services/lead-scoring.service';
import { LeadScoringController } from './interfaces/controllers/lead-scoring.controller';

@Module({
  controllers: [LeadScoringController],
  providers: [LeadScoringRepository, LeadScoringService],
  exports: [LeadScoringService, LeadScoringRepository],
})
export class LeadScoringModule {}
