import { Module } from '@nestjs/common';
import { CsatRepository } from './infrastructure/repositories/csat.repository';
import { CsatController } from './interfaces/controllers/csat.controller';

@Module({
  controllers: [CsatController],
  providers: [CsatRepository],
  exports: [CsatRepository],
})
export class CsatModule {}
