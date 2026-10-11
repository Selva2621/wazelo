import { Module } from '@nestjs/common';
import { OrgRepository } from './infrastructure/repositories/org.repository';
import { OrgService } from './domain/services/org.service';
import { GetOrgSettingsUseCase } from './application/use-cases/get-org-settings.use-case';
import { UpdateOrgSettingsUseCase } from './application/use-cases/update-org-settings.use-case';
import { RebuildOrgMemoryUseCase } from './application/use-cases/rebuild-org-memory.use-case';
import { OnboardOrgUseCase } from './application/use-cases/onboard-org.use-case';
import { OrgOnboardingRepository } from './infrastructure/repositories/org-onboarding.repository';
import { OrgAiMemoryService } from './domain/services/org-ai-memory.service';
import { OrgController } from './interfaces/controllers/org.controller';
import { AuditModule } from '../audit/audit.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AiProviderService } from '../ai/domain/services/ai-provider.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  // BillingModule: KillSwitchService for this module's AiProviderService
  imports: [AuditModule, KnowledgeBaseModule, BillingModule],
  controllers: [OrgController],
  providers: [
    OrgRepository,
    OrgService,
    GetOrgSettingsUseCase,
    UpdateOrgSettingsUseCase,
    AiProviderService,
    OrgAiMemoryService,
    RebuildOrgMemoryUseCase,
    OrgOnboardingRepository,
    OnboardOrgUseCase,
  ],
  exports: [
    OrgService,
    OrgRepository,
    OrgAiMemoryService,
    RebuildOrgMemoryUseCase,
    OnboardOrgUseCase,
  ],
})
export class OrgModule {}
