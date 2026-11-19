import { Module } from '@nestjs/common';
import { TourProgressRepository } from './infrastructure/repositories/tour-progress.repository';
import { ManageTourProgressUseCase } from './application/use-cases/manage-tour-progress.use-case';
import { ToursController } from './interfaces/controllers/tours.controller';

/** Product tour progress per user and device. */
@Module({
  controllers: [ToursController],
  providers: [TourProgressRepository, ManageTourProgressUseCase],
})
export class ToursModule {}
