import { Module } from '@nestjs/common';
import { ApiKeysModule } from '@/modules/api-keys/api-keys.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { ApiKeysRepository } from '@/modules/api-keys/infrastructure/repositories/api-keys.repository';
import { DeveloperApiRepository } from './infrastructure/repositories/developer-api.repository';
import { DevSendMessageUseCase } from './application/use-cases/send-message.use-case';
import { DevSendBulkMessageUseCase } from './application/use-cases/send-bulk-message.use-case';
import { DevSendTemplateMessageUseCase } from './application/use-cases/send-template-message.use-case';
import { DeveloperApiController } from './interfaces/controllers/developer-api.controller';
import { DeveloperPortalController } from './interfaces/controllers/developer-portal.controller';

@Module({
  imports: [ApiKeysModule, BillingModule],
  controllers: [DeveloperApiController, DeveloperPortalController],
  providers: [DeveloperApiRepository, DevSendMessageUseCase, DevSendBulkMessageUseCase, DevSendTemplateMessageUseCase, ApiKeysRepository],
  exports: [DeveloperApiRepository],
})
export class DeveloperApiModule {}
