import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { GdprRepository } from './infrastructure/repositories/gdpr.repository';
import { GdprController } from './interfaces/controllers/gdpr.controller';

@Module({
  imports: [AuditModule],
  controllers: [GdprController],
  providers: [GdprRepository],
  exports: [GdprRepository],
})
export class GdprModule {}
