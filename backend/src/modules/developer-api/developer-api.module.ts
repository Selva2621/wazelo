import { Module } from '@nestjs/common';
import { ApiKeysModule } from '@/modules/api-keys/api-keys.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { ContactsModule } from '@/modules/contacts/contacts.module';
import { DealsModule } from '@/modules/deals/deals.module';
import { ApiKeysRepository } from '@/modules/api-keys/infrastructure/repositories/api-keys.repository';
import { DeveloperApiRepository } from './infrastructure/repositories/developer-api.repository';
import { DevSendMessageUseCase } from './application/use-cases/send-message.use-case';
import { DevSendBulkMessageUseCase } from './application/use-cases/send-bulk-message.use-case';
import { DevSendTemplateMessageUseCase } from './application/use-cases/send-template-message.use-case';
import { DeveloperApiController } from './interfaces/controllers/developer-api.controller';
import { DeveloperPortalController } from './interfaces/controllers/developer-portal.controller';
import { DeveloperDocsController } from './interfaces/controllers/developer-docs.controller';
import { GetDeveloperDashboardUseCase } from './application/use-cases/get-developer-dashboard.use-case';
import { ApiRequestLogInterceptor } from './interfaces/interceptors/api-request-log.interceptor';

@Module({
  // ContactsModule: notes, tags and lead status go through its use-cases so
  // audit logs, automations and outgoing webhooks fire as they do in the app
  imports: [ApiKeysModule, BillingModule, MessagesModule, ContactsModule, DealsModule],
  controllers: [DeveloperDocsController, DeveloperApiController, DeveloperPortalController],
  providers: [
    DeveloperApiRepository,
    DevSendMessageUseCase,
    DevSendBulkMessageUseCase,
    DevSendTemplateMessageUseCase,
    GetDeveloperDashboardUseCase,
    ApiRequestLogInterceptor,
    ApiKeysRepository,
  ],
  exports: [DeveloperApiRepository],
})
export class DeveloperApiModule {}
