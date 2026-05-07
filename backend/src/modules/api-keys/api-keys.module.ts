import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { ApiKeysRepository } from './infrastructure/repositories/api-keys.repository';
import { ApiKeysController } from './interfaces/controllers/api-keys.controller';
import { ApiKeyGuard } from './interfaces/guards/api-key.guard';

@Module({
  imports: [AuditModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysRepository, ApiKeyGuard],
  exports: [ApiKeysRepository, ApiKeyGuard],
})
export class ApiKeysModule {}
