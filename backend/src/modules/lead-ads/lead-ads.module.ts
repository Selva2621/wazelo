import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Infrastructure
import { LeadAdRepository } from './infrastructure/repositories/lead-ad.repository';
import { LeadAdsConfigRepository } from './infrastructure/repositories/lead-ads-config.repository';

// Domain Services
import { MetaGraphApiService } from './domain/services/meta-graph-api.service';
import { LeadAdWebhookService } from './domain/services/lead-ad-webhook.service';
import { LeadAssignmentService } from './domain/services/lead-assignment.service';

// Use Cases
import { ProcessLeadAdUseCase } from './application/use-cases/process-lead-ad.use-case';
import { GetLeadAdAnalyticsUseCase } from './application/use-cases/get-lead-ad-analytics.use-case';

// Controllers
import { LeadAdsController } from './interfaces/controllers/lead-ads.controller';
import { LeadAdsWebhookController } from './interfaces/controllers/lead-ads-webhook.controller';

// Import channel module for credential access
import { ChannelsModule } from '@/modules/channels/channels.module';

@Module({
  imports: [ConfigModule, ChannelsModule],
  controllers: [LeadAdsController, LeadAdsWebhookController],
  providers: [
    LeadAdRepository,
    LeadAdsConfigRepository,
    MetaGraphApiService,
    LeadAdWebhookService,
    LeadAssignmentService,
    ProcessLeadAdUseCase,
    GetLeadAdAnalyticsUseCase,
  ],
  exports: [
    LeadAdRepository,
    ProcessLeadAdUseCase,
    MetaGraphApiService,
  ],
})
export class LeadAdsModule {}
