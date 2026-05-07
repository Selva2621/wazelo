import { Module } from '@nestjs/common';
import { CustomFieldsRepository } from './infrastructure/repositories/custom-fields.repository';
import { CustomFieldsController } from './interfaces/controllers/custom-fields.controller';

@Module({
  controllers: [CustomFieldsController],
  providers: [CustomFieldsRepository],
  exports: [CustomFieldsRepository],
})
export class CustomFieldsModule {}
