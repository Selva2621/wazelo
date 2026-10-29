import { Module } from '@nestjs/common';
import { WidgetRepository } from './infrastructure/repositories/widget.repository';
import { WidgetAdminController } from './interfaces/controllers/widget-admin.controller';
import { WidgetPublicController } from './interfaces/controllers/widget-public.controller';
import {
  GetWidgetConfigUseCase,
  UpdateWidgetConfigUseCase,
  StartWidgetSessionUseCase,
  SendWidgetMessageUseCase,
  WidgetChatsUseCase,
} from './application/use-cases';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { ContactsModule } from '../contacts/contacts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WidgetLeadsService } from './application/services/widget-leads.service';

@Module({
  // BillingModule: AI credits for the widget's AI assistant replies
  // Contacts + Notifications: visitors who leave a phone become contacts, and the team is alerted
  imports: [AuditModule, AiModule, BillingModule, ContactsModule, NotificationsModule],
  controllers: [WidgetAdminController, WidgetPublicController],
  providers: [
    WidgetRepository,
    GetWidgetConfigUseCase,
    UpdateWidgetConfigUseCase,
    StartWidgetSessionUseCase,
    SendWidgetMessageUseCase,
    WidgetLeadsService,
    // Inbox → Website: the team reads and answers website chats
    WidgetChatsUseCase,
  ],
  exports: [WidgetRepository],
})
export class WidgetModule {}
