import { Module } from '@nestjs/common';
import { EncryptionService } from '@/common/services';
import { SmtpMailer } from '@/infrastructure/external/email/smtp-mailer';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { GenerateEmailTemplateUseCase } from './application/use-cases/generate-email-template.use-case';
import { EmailRepository } from './infrastructure/repositories/email.repository';
import { OrgEmailService } from './application/services/org-email.service';
import { EmailAccountUseCase } from './application/use-cases/email-account.use-case';
import { EmailTemplatesUseCase } from './application/use-cases/email-templates.use-case';
import { EmailController } from './interfaces/controllers/email.controller';
import { EmailUnsubscribeController } from './interfaces/controllers/email-unsubscribe.controller';

/**
 * Email from the workspace's own mailbox (SMTP): setup, templates, sending with a
 * log of every email, and unsubscribe. Campaigns, automations and sequences use
 * OrgEmailService to send.
 */
@Module({
  // AiModule + BillingModule: "Write with AI" on email templates (metered by @AiCredits)
  imports: [AuditModule, AiModule, BillingModule],
  controllers: [EmailController, EmailUnsubscribeController],
  providers: [
    EncryptionService,
    SmtpMailer,
    EmailRepository,
    OrgEmailService,
    EmailAccountUseCase,
    EmailTemplatesUseCase,
    GenerateEmailTemplateUseCase,
  ],
  exports: [OrgEmailService, EmailRepository],
})
export class EmailModule {}
