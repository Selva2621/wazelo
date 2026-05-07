import { Module } from '@nestjs/common';
import { AuditRepository } from './infrastructure/repositories/audit.repository';
import { AuditService } from './domain/services/audit.service';
import { AuditController } from './interfaces/controllers/audit.controller';
import { QueryAuditLogsUseCase } from './application/use-cases/query-audit-logs.use-case';

@Module({
  controllers: [AuditController],
  providers: [AuditRepository, AuditService, QueryAuditLogsUseCase],
  exports: [AuditService],
})
export class AuditModule {}
