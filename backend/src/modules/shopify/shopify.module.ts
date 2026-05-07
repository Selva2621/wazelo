import { Module, forwardRef } from '@nestjs/common';
import { ShopifyWebhookController } from './interfaces/controllers/shopify-webhook.controller';
import { ShopifyWebhookService } from './domain/services/shopify-webhook.service';
import { ProcessShopifyWebhookUseCase } from './application/use-cases/process-shopify-webhook.use-case';
import { EncryptionService } from '@/modules/settings/domain/services/encryption.service';
import { AutomationModule } from '@/modules/automation/automation.module';

@Module({
  imports: [forwardRef(() => AutomationModule)],
  controllers: [ShopifyWebhookController],
  providers: [
    ShopifyWebhookService,
    ProcessShopifyWebhookUseCase,
    EncryptionService,
  ],
  exports: [ProcessShopifyWebhookUseCase],
})
export class ShopifyModule {}
