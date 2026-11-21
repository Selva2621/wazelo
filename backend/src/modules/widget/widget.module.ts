import { Module } from '@nestjs/common';
import { WidgetRepository } from './infrastructure/repositories/widget.repository';
import { WebsiteChatRepository } from './infrastructure/repositories/website-chat.repository';
import { WidgetAdminController } from './interfaces/controllers/widget-admin.controller';
import { WidgetPublicController } from './interfaces/controllers/widget-public.controller';
import {
  GetWidgetConfigUseCase,
  UpdateWidgetConfigUseCase,
  StartWidgetSessionUseCase,
  SendWidgetMessageUseCase,
  WidgetChatsUseCase,
} from './application/use-cases';
import { WebsiteChatUseCase } from './application/use-cases/website-chat.use-case';
import { WebsiteChatAssistUseCase } from './application/use-cases/website-chat-assist.use-case';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { ContactsModule } from '../contacts/contacts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WidgetLeadsService } from './application/services/widget-leads.service';
import { WebsiteHandoffService } from './application/services/website-handoff.service';

@Module({
  // BillingModule: AI credits for the widget's AI assistant replies
  // Contacts + Notifications: visitors who agree to be contacted become contacts, and the team is alerted
  imports: [AuditModule, AiModule, BillingModule, ContactsModule, NotificationsModule],
  controllers: [WidgetAdminController, WidgetPublicController],
  providers: [
    WidgetRepository,
    WebsiteChatRepository,
    GetWidgetConfigUseCase,
    UpdateWidgetConfigUseCase,
    StartWidgetSessionUseCase,
    SendWidgetMessageUseCase,
    WidgetLeadsService,
    // Inbox → Website: the team reads and answers website chats
    WidgetChatsUseCase,
    // Visitor asks for a person: alerts, offers, accept/decline, timeline
    WebsiteHandoffService,
    WebsiteChatUseCase,
    // AI summary + suggested replies for the member who takes a chat
    WebsiteChatAssistUseCase,
  ],
  // WebsiteHandoffService: the handover timers run in the jobs worker
  exports: [WidgetRepository, WebsiteHandoffService],
})
export class WidgetModule {}
