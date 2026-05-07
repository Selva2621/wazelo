import { Module } from '@nestjs/common';
import { OrgRepository } from './infrastructure/repositories/org.repository';
import { OrgService } from './domain/services/org.service';
import { GetOrgSettingsUseCase } from './application/use-cases/get-org-settings.use-case';
import { UpdateOrgSettingsUseCase } from './application/use-cases/update-org-settings.use-case';
import { RebuildOrgMemoryUseCase } from './application/use-cases/rebuild-org-memory.use-case';
import { OrgAiMemoryService } from './domain/services/org-ai-memory.service';
import { OrgController } from './interfaces/controllers/org.controller';
import { AuditModule } from '../audit/audit.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AiProviderService } from '../ai/domain/services/ai-provider.service';

@Module({
  imports: [AuditModule, KnowledgeBaseModule],
  controllers: [OrgController],
  providers: [
    OrgRepository,
    OrgService,
    GetOrgSettingsUseCase,
    UpdateOrgSettingsUseCase,
    AiProviderService,
    OrgAiMemoryService,
    RebuildOrgMemoryUseCase,
  ],
  exports: [OrgService, OrgRepository, OrgAiMemoryService, RebuildOrgMemoryUseCase],
})
export class OrgModule {}
