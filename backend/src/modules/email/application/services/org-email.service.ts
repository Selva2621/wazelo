import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_NAMES, QUEUE_NAMES } from '@/common/constants';
import { EncryptionService } from '@/common/services';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SmtpMailer, isPermanentSmtpError } from '@/infrastructure/external/email/smtp-mailer';
import { EmailRepository, EmailSource } from '../../infrastructure/repositories/email.repository';
import { fillFields, isEmail, toEmailHtml, toEmailText } from '../../domain/services/email-render';
import { signUnsubscribe } from '../../domain/services/unsubscribe-token';

export interface QueueEmailInput {
  orgId: string;
  /** Who it goes to: a contact (their email, name, unsubscribe) … */
  contactId?: string;
  /** … or a plain address (test emails) */
  to?: string;
  subject: string;
  body: string;
  source: EmailSource;
  sourceId?: string;
  /** One email per key: a retried job never sends twice */
  idempotencyKey: string;
}

export interface QueuedEmail {
  emailMessageId: string;
  status: 'QUEUED' | 'SKIPPED' | 'SENT' | 'FAILED';
  reason?: string;
}

export interface EmailOutcomeEvent {
  orgId: string;
  emailMessageId: string;
  source: EmailSource;
  sourceId: string | null;
  contactId: string | null;
  error?: string;
}

export interface SendOrgEmailJob {
  emailMessageId: string;
}

type EventBase = { orgId: string; source: EmailSource; sourceId?: string };

/** Retries for a mail server that's busy or unreachable (not for a wrong login or bad address) */
const MAX_ATTEMPTS = 4;

/**
 * Email from the workspace's own mailbox. `queue` checks the email can go (account
 * connected, contact reachable and not unsubscribed), writes it to the log and
 * hands it to the queue; the worker calls `deliver`. Every email ends SENT, FAILED
 * or SKIPPED in the log with the reason, and an event tells campaigns/sequences.
 */
@Injectable()
export class OrgEmailService {
  private readonly logger = new Logger(OrgEmailService.name);

  constructor(
    private readonly repo: EmailRepository,
    private readonly queueService: QueueService,
    private readonly mailer: SmtpMailer,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  async queue(input: QueueEmailInput): Promise<QueuedEmail> {
    const existing = await this.repo.findByKey(input.idempotencyKey);
    if (existing) return { emailMessageId: existing.id, status: existing.status as QueuedEmail['status'], reason: existing.error ?? undefined };

    const [account, org, contact] = await Promise.all([
      this.repo.account(input.orgId),
      this.repo.businessName(input.orgId),
      input.contactId ? this.repo.contact(input.orgId, input.contactId) : Promise.resolve(null),
    ]);
    const to = (contact?.email ?? input.to ?? '').trim();
    const vars = { name: contact?.name, email: contact?.email ?? to, phone: contact?.phoneNumber, company: account?.fromName || org?.name };
    const subject = fillFields(input.subject, vars).slice(0, 255);
    const body = fillFields(input.body, vars);

    const skip =
      !account ? 'No email account connected' :
      account.status !== 'ACTIVE' ? 'The email account needs to be reconnected' :
      input.contactId && !contact ? 'Contact not found' :
      contact && (contact.deletedAt || contact.mergedIntoId) ? 'Contact deleted or merged' :
      contact?.emailOptedOut ? 'Unsubscribed from email' :
      !isEmail(to) ? 'No valid email address' :
      null;

    const message = await this.repo.createMessage({
      orgId: input.orgId,
      contactId: contact?.id ?? null,
      toAddress: to.slice(0, 320) || '(none)',
      subject: subject || '(no subject)',
      body,
      status: skip ? 'SKIPPED' : 'QUEUED',
      error: skip,
      source: input.source,
      sourceId: input.sourceId ?? null,
      idempotencyKey: input.idempotencyKey,
    });

    if (skip) {
      // The caller records the skip itself (it gets the reason back right here)
      this.logger.log(`Email skipped org=${input.orgId} source=${input.source}:${input.sourceId ?? '-'} reason="${skip}"`);
      return { emailMessageId: message.id, status: 'SKIPPED', reason: skip };
    }

    await this.queueService.publish<SendOrgEmailJob>(QUEUE_NAMES.SEND_ORG_EMAIL, { emailMessageId: message.id }, {
      retryLimit: MAX_ATTEMPTS - 1,
      retryDelay: 60,
      retryBackoff: true,
      singletonKey: `email:${message.id}`,
    });
    return { emailMessageId: message.id, status: 'QUEUED' };
  }

  /** The worker: sends one queued email. Throws only for errors worth retrying. */
  async deliver(job: SendOrgEmailJob): Promise<void> {
    const message = await this.repo.message(job.emailMessageId);
    if (!message || message.status !== 'QUEUED') return;
    const event: EventBase = { orgId: message.orgId, source: message.source as EmailSource, sourceId: message.sourceId ?? undefined };

    const account = await this.repo.account(message.orgId);
    if (!account || account.status !== 'ACTIVE') {
      await this.fail(message.id, event, message.contactId, 'The email account was disconnected before sending');
      return;
    }
    // The provider's daily cap: wait for tomorrow instead of getting the mailbox blocked
    if (!(await this.repo.takeDailySlot(message.orgId))) {
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 5, 0, 0);
      const wait = Math.max(60, Math.round((tomorrow.getTime() - Date.now()) / 1000));
      this.logger.warn(`Daily email limit reached org=${message.orgId}: email ${message.id} waits ${wait}s`);
      await this.queueService.publishDelayed<SendOrgEmailJob>(QUEUE_NAMES.SEND_ORG_EMAIL, job, wait);
      return;
    }

    const { attempts } = await this.repo.countAttempt(message.id);
    const unsubscribeUrl = this.unsubscribeUrl(message.orgId, message.contactId);
    const business = account.fromName;
    try {
      const sent = await this.mailer.send(
        {
          host: account.host,
          port: account.port,
          secure: account.secure,
          username: account.username,
          password: this.encryption.decrypt(account.encryptedPassword),
        },
        {
          from: { name: account.fromName, address: account.fromAddress },
          replyTo: account.replyTo,
          to: message.toAddress,
          subject: message.subject,
          html: toEmailHtml(message.body, { business, unsubscribeUrl }),
          text: toEmailText(message.body, { business, unsubscribeUrl }),
          unsubscribeUrl,
        },
      );
      await this.repo.finishMessage(message.id, 'SENT', { providerMessageId: sent.messageId });
      this.logger.log(`Email sent org=${message.orgId} id=${message.id} source=${message.source}`);
      this.emit(EVENT_NAMES.EMAIL_SENT, message.id, event, message.contactId);
    } catch (err) {
      const reason = (err as Error).message || 'The mail server refused the email';
      const permanent = isPermanentSmtpError(err);
      this.logger.warn(`Email send failed org=${message.orgId} id=${message.id} attempt=${attempts} permanent=${permanent}: ${reason}`);
      if (permanent || attempts >= MAX_ATTEMPTS) {
        await this.fail(message.id, event, message.contactId, reason);
        // A wrong login stops every email: the account needs attention
        if ((err as { code?: string }).code === 'EAUTH') await this.repo.setAccountStatus(message.orgId, 'ERROR', reason);
        return;
      }
      throw err; // the queue retries with backoff
    }
  }

  /** A link that unsubscribes this contact from the workspace's emails */
  unsubscribeUrl(orgId: string, contactId: string | null): string {
    const base = (this.config.get<string>('app.frontendUrl') || 'http://localhost:3001').replace(/\/$/, '');
    const prefix = this.config.get<string>('app.apiPrefix') || 'api/v1';
    if (!contactId) return `${base}/`;
    return `${base}/${prefix}/email/unsubscribe?t=${encodeURIComponent(signUnsubscribe(orgId, contactId, this.secret()))}`;
  }

  secret(): string {
    return this.config.get<string>('jwt.accessSecret') || 'dev-secret';
  }

  private async fail(id: string, event: EventBase, contactId: string | null, reason: string) {
    if (await this.repo.finishMessage(id, 'FAILED', { error: reason })) {
      this.emit(EVENT_NAMES.EMAIL_FAILED, id, event, contactId, reason);
    }
  }

  private emit(name: string, emailMessageId: string, e: EventBase, contactId: string | null, error?: string) {
    this.events.emit(name, {
      orgId: e.orgId,
      emailMessageId,
      source: e.source,
      sourceId: e.sourceId ?? null,
      contactId,
      ...(error ? { error } : {}),
    } satisfies EmailOutcomeEvent);
  }
}
