import { Module } from '@nestjs/common';
import { WhatsAppModule } from '@/modules/whatsapp/whatsapp.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { ContactsModule } from '@/modules/contacts/contacts.module';
import { CampaignsModule } from '@/modules/campaigns/campaigns.module';
import { AutomationModule } from '@/modules/automation/automation.module';
import { WebSocketModule } from '@/infrastructure/websocket/websocket.module';
import { ObservabilityModule } from '@/modules/observability/observability.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { UsersModule } from '@/modules/users/users.module';
import { AuthEventsHandler } from './handlers/auth-events.handler';
import { OrgUserEventsHandler } from './handlers/org-user-events.handler';
import { WhatsAppEventsHandler } from './handlers/whatsapp-events.handler';
import { BaileysBridgeHandler } from './handlers/baileys-bridge.handler';
import { ContactEventsHandler } from './handlers/contact-events.handler';
import { CampaignEventsHandler } from './handlers/campaign-events.handler';
// EPIC 7 — Scheduling & Automation events
import { AutomationEventsHandler } from './handlers/automation-events.handler';
// EPIC 8 — RBAC & Access Control events
import { RbacEventsHandler } from './handlers/rbac-events.handler';
// EPIC 9 — Billing & Subscription events
import { BillingEventsHandler } from './handlers/billing-events.handler';
// EPIC 10 — Observability events
import { ObservabilityEventsHandler } from './handlers/observability-events.handler';
// EPIC 11 — Notification events
import { NotificationEventsHandler } from './handlers/notification-events.handler';
// EPIC 12 — Settings & Configuration events
import { SettingsEventsHandler } from './handlers/settings-events.handler';
import { SettingsModule } from '@/modules/settings/settings.module';
// EPIC 15 — SLA Tracking events
import { SlaEventsHandler } from './handlers/sla-events.handler';
import { SlaModule } from '@/modules/sla/sla.module';
// EPIC 16 — Multi-Channel Integration events
import { ChannelEventsHandler } from './handlers/channel-events.handler';
// Social Ads Lead Integration events
import { LeadAdEventsHandler } from './handlers/lead-ad-events.handler';
// CSAT events
import { CsatEventsHandler } from './handlers/csat-events.handler';
import { CsatModule } from '@/modules/csat/csat.module';
// Lead Scoring events
import { LeadScoringEventsHandler } from './handlers/lead-scoring-events.handler';
import { LeadScoringModule } from '@/modules/lead-scoring/lead-scoring.module';
// Developer API webhook events
import { DeveloperWebhookHandler } from './handlers/developer-webhook.handler';
// Message pipeline (chatbot-first → automation)
import { MessagePipelineHandler } from './handlers/message-pipeline.handler';
import { MessagePipelineService } from '@/modules/messages/application/services/message-pipeline.service';
import { ChatbotModule } from '@/modules/chatbot/chatbot.module';
// Drip Sequence events
import { SequenceEventsHandler } from './handlers/sequence-events.handler';
import { SequencesModule } from '@/modules/sequences/sequences.module';
// Purchase Intent detection
import { PurchaseIntentHandler } from './handlers/purchase-intent.handler';
import { DealsModule } from '@/modules/deals/deals.module';
import { AiModule } from '@/modules/ai/ai.module';
// Org AI Memory events
import { OrgMemoryEventsHandler } from './handlers/org-memory-events.handler';
import { OrgModule } from '@/modules/org/org.module';

@Module({
  imports: [
    WhatsAppModule,
    AuditModule,
    ContactsModule,
    CampaignsModule,
    AutomationModule,
    WebSocketModule,
    ObservabilityModule,
    NotificationsModule,
    UsersModule,
    SettingsModule,
    SlaModule,
    CsatModule,
    LeadScoringModule,
    SequencesModule,
    ChatbotModule,
    DealsModule,
    AiModule,
    OrgModule,
  ],
  providers: [
    AuthEventsHandler,
    OrgUserEventsHandler,
    WhatsAppEventsHandler,
    BaileysBridgeHandler,
    ContactEventsHandler,
    // EPIC 6 — Campaign Management events
    CampaignEventsHandler,
    // EPIC 7 — Scheduling & Automation events
    AutomationEventsHandler,
    // EPIC 8 — RBAC & Access Control events
    RbacEventsHandler,
    // EPIC 9 — Billing & Subscription events
    BillingEventsHandler,
    // EPIC 10 — Observability events
    ObservabilityEventsHandler,
    // EPIC 11 — Notification events
    NotificationEventsHandler,
    // EPIC 12 — Settings & Configuration events
    SettingsEventsHandler,
    // EPIC 15 — SLA Tracking events
    SlaEventsHandler,
    // EPIC 16 — Multi-Channel Integration events
    ChannelEventsHandler,
    // Social Ads Lead Integration events
    LeadAdEventsHandler,
    // CSAT events
    CsatEventsHandler,
    // Lead Scoring events
    LeadScoringEventsHandler,
    // Drip Sequence events
    SequenceEventsHandler,
    // Developer API webhook events
    DeveloperWebhookHandler,
    // Message pipeline (chatbot-first → automation, prevents race condition)
    MessagePipelineService,
    MessagePipelineHandler,
    // Purchase intent detection
    PurchaseIntentHandler,
    // Org AI Memory rebuild events
    OrgMemoryEventsHandler,
  ],
})
export class EventsModule {}
