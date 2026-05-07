import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { QueueModule } from '@/infrastructure/queue/queue.module';

// Domain services
import { EncryptionService } from './domain/services/encryption.service';
import { ConfigResolutionService } from './domain/services/config-resolution.service';
import { WebhookSigningService } from './domain/services/webhook-signing.service';

// Repository
import { SettingsRepository } from './infrastructure/repositories/settings.repository';

// Use cases
import { ManageSettingsUseCase } from './application/use-cases/manage-settings.use-case';
import { ManageFeatureFlagsUseCase } from './application/use-cases/manage-feature-flags.use-case';
import { ManageIntegrationsUseCase } from './application/use-cases/manage-integrations.use-case';
import { ManageWebhooksUseCase } from './application/use-cases/manage-webhooks.use-case';

// Controller
import { SettingsController } from './interfaces/controllers/settings.controller';

@Module({
  imports: [AuditModule, QueueModule],
  controllers: [SettingsController],
  providers: [
    // Domain services
    EncryptionService,
    ConfigResolutionService,
    WebhookSigningService,

    // Repository
    SettingsRepository,

    // Use cases
    ManageSettingsUseCase,
    ManageFeatureFlagsUseCase,
    ManageIntegrationsUseCase,
    ManageWebhooksUseCase,
  ],
  exports: [
    // Exported so other modules can use these services
    ConfigResolutionService,
    ManageFeatureFlagsUseCase,
    ManageWebhooksUseCase,
    EncryptionService,
    SettingsRepository,
    WebhookSigningService,
  ],
})
export class SettingsModule {}
