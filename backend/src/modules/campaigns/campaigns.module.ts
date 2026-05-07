import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { WhatsAppModule } from '@/modules/whatsapp/whatsapp.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { AiModule } from '@/modules/ai/ai.module';

// Repositories
import { CampaignRepository } from './infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from './infrastructure/repositories/campaign-recipient.repository';

// Domain services
import { AudienceResolverService } from './domain/services/audience-resolver.service';
import { CampaignStateMachineService } from './domain/services/campaign-state-machine.service';

// Use cases
import { CreateCampaignUseCase } from './application/use-cases/create-campaign.use-case';
import { UpdateCampaignUseCase } from './application/use-cases/update-campaign.use-case';
import { ExecuteCampaignUseCase } from './application/use-cases/execute-campaign.use-case';
import { ScheduleCampaignUseCase } from './application/use-cases/schedule-campaign.use-case';
import { PauseCampaignUseCase } from './application/use-cases/pause-campaign.use-case';
import { ResumeCampaignUseCase } from './application/use-cases/resume-campaign.use-case';
import { CancelCampaignUseCase } from './application/use-cases/cancel-campaign.use-case';
import { GetCampaignUseCase } from './application/use-cases/get-campaign.use-case';
import { ListCampaignsUseCase } from './application/use-cases/list-campaigns.use-case';
import { GetCampaignAnalyticsUseCase } from './application/use-cases/get-campaign-analytics.use-case';
import { PreviewAudienceUseCase } from './application/use-cases/preview-audience.use-case';
import { GenerateCampaignCopyUseCase } from './application/use-cases/generate-campaign-copy.use-case';

// Controller
import { CampaignController } from './interfaces/controllers/campaign.controller';

@Module({
  imports: [
    AuditModule,
    BillingModule,
    AiModule,
    forwardRef(() => WhatsAppModule),
    forwardRef(() => MessagesModule),
  ],
  controllers: [CampaignController],
  providers: [
    // Repositories
    CampaignRepository,
    CampaignRecipientRepository,

    // Domain services
    AudienceResolverService,
    CampaignStateMachineService,

    // Use cases
    CreateCampaignUseCase,
    UpdateCampaignUseCase,
    ExecuteCampaignUseCase,
    ScheduleCampaignUseCase,
    PauseCampaignUseCase,
    ResumeCampaignUseCase,
    CancelCampaignUseCase,
    GetCampaignUseCase,
    ListCampaignsUseCase,
    GetCampaignAnalyticsUseCase,
    PreviewAudienceUseCase,
    GenerateCampaignCopyUseCase,
  ],
  exports: [
    CampaignRepository,
    CampaignRecipientRepository,
    AudienceResolverService,
    CampaignStateMachineService,
  ],
})
export class CampaignsModule {}
