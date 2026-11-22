import { Module } from '@nestjs/common';
import { ContactsModule } from '@/modules/contacts/contacts.module';
import { DealsModule } from '@/modules/deals/deals.module';
import { LeadAdsModule } from '@/modules/lead-ads/lead-ads.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { HqLeadsRepository } from './infrastructure/repositories/hq-leads.repository';
import { SyncSignupLeadUseCase } from './application/use-cases/sync-signup-lead.use-case';
import { SendPlatformAlertUseCase } from './application/use-cases/send-platform-alert.use-case';
import { SendTrialRemindersUseCase } from './application/use-cases/send-trial-reminders.use-case';
import { HqSetupStatusUseCase } from './application/use-cases/hq-setup-status.use-case';
import { WhatsappVerificationUseCase } from './application/use-cases/whatsapp-verification.use-case';
import { WhatsappVerificationController } from './interfaces/controllers/whatsapp-verification.controller';
import { HqWhatsappSender } from './application/services/hq-whatsapp-sender.service';
import { HqDefaultTemplatesService } from './application/services/hq-default-templates.service';

/**
 * Wazelo HQ: the platform's own CRM work — sign-ups become HQ leads with segment
 * tags, Wazelo → customer WhatsApp alerts and sign-up number codes go out from HQ's number.
 */
@Module({
  imports: [ContactsModule, DealsModule, LeadAdsModule, MessagesModule, NotificationsModule],
  controllers: [WhatsappVerificationController],
  providers: [
    HqLeadsRepository,
    SyncSignupLeadUseCase,
    SendPlatformAlertUseCase,
    SendTrialRemindersUseCase,
    HqSetupStatusUseCase,
    WhatsappVerificationUseCase,
    HqWhatsappSender,
    HqDefaultTemplatesService,
  ],
  exports: [SyncSignupLeadUseCase, SendPlatformAlertUseCase, SendTrialRemindersUseCase, HqSetupStatusUseCase, HqWhatsappSender],
})
export class HqModule {}
