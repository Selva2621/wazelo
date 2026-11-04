import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction, EmailAccount } from '@prisma/client';
import { EncryptionService } from '@/common/services';
import { SmtpMailer, SmtpSettings } from '@/infrastructure/external/email/smtp-mailer';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EmailRepository } from '../../infrastructure/repositories/email.repository';
import { OrgEmailService } from '../services/org-email.service';
import { SMTP_PRESETS, toEmailHtml, toEmailText } from '../../domain/services/email-render';
import { SaveEmailAccountDto } from '../dto/email.dto';

/** Plain words for what mail servers usually answer when the login is wrong */
function explain(err: unknown): string {
  const e = err as { code?: string; message?: string };
  if (e?.code === 'EAUTH') return 'The mail server rejected the login. Check the email and app password.';
  if (e?.code === 'ETIMEDOUT' || e?.code === 'ECONNECTION' || e?.code === 'ESOCKET') return "Couldn't reach the mail server. Check the server and port.";
  if (e?.code === 'EDNS' || e?.code === 'ENOTFOUND') return "That mail server doesn't exist. Check the server name.";
  return e?.message?.slice(0, 300) || "Couldn't connect to the mail server.";
}

/**
 * The workspace's business email (one per workspace). Saving logs in to the mail
 * server first; nothing is saved with a login that doesn't work. The password is
 * stored encrypted and never sent back to the app.
 */
@Injectable()
export class EmailAccountUseCase {
  private readonly logger = new Logger(EmailAccountUseCase.name);

  constructor(
    private readonly repo: EmailRepository,
    private readonly mailer: SmtpMailer,
    private readonly encryption: EncryptionService,
    private readonly email: OrgEmailService,
    private readonly audit: AuditService,
  ) {}

  async get(orgId: string) {
    const a = await this.repo.account(orgId);
    return a ? this.view(a) : null;
  }

  async save(orgId: string, userId: string, dto: SaveEmailAccountDto) {
    const existing = await this.repo.account(orgId);
    const preset = dto.provider !== 'CUSTOM' ? SMTP_PRESETS[dto.provider] : null;
    const host = (preset?.host ?? dto.host ?? '').trim();
    const port = preset?.port ?? dto.port ?? 587;
    const secure = preset?.secure ?? dto.secure ?? port === 465;
    const username = (dto.username?.trim() || dto.fromAddress).trim();
    const password = dto.password?.replace(/\s+/g, '') || (existing ? this.encryption.decrypt(existing.encryptedPassword) : '');
    if (!host) throw new BadRequestException('Enter the mail server (SMTP host)');
    if (!password) throw new BadRequestException('Enter the app password');

    const settings: SmtpSettings = { host, port, secure, username, password };
    try {
      await this.mailer.verify(settings);
    } catch (err) {
      this.logger.warn(`Email account check failed org=${orgId} host=${host}: ${(err as Error).message}`);
      throw new BadRequestException(explain(err));
    }

    const saved = await this.repo.saveAccount(orgId, {
      provider: dto.provider,
      host,
      port,
      secure,
      username,
      encryptedPassword: this.encryption.encrypt(password),
      fromName: dto.fromName.trim(),
      fromAddress: dto.fromAddress.trim().toLowerCase(),
      replyTo: dto.replyTo?.trim() || null,
      status: 'ACTIVE',
      lastError: null,
      verifiedAt: new Date(),
      dailyLimit: dto.dailyLimit ?? existing?.dailyLimit ?? preset?.dailyLimit ?? 300,
      createdById: existing?.createdById ?? userId,
    });
    void this.audit.log({
      orgId,
      userId,
      action: AuditAction.INTEGRATION_CONFIG_UPDATED,
      targetType: 'EmailAccount',
      targetId: saved.id,
      metadata: { provider: dto.provider, host, fromAddress: saved.fromAddress },
    });
    return this.view(saved);
  }

  /** Sends a real email now (not queued), so the owner sees at once that it arrives */
  async sendTest(orgId: string, userId: string, to?: string) {
    const a = await this.repo.account(orgId);
    if (!a) throw new NotFoundException('Connect an email account first');
    const address = (to || a.fromAddress).trim();
    const subject = `Test email from ${a.fromName}`;
    const body = `This is a test from Wazelo.\n\nIf you can read this, your email is connected and campaigns, automations and sequences can send from ${a.fromAddress}.`;
    const opts = { business: a.fromName, unsubscribeUrl: this.email.unsubscribeUrl(orgId, null) };
    const log = await this.repo.createMessage({
      orgId,
      toAddress: address,
      subject,
      body,
      status: 'QUEUED',
      source: 'TEST',
      idempotencyKey: `email-test:${orgId}:${Date.now()}`,
    });
    try {
      const sent = await this.mailer.send(
        { host: a.host, port: a.port, secure: a.secure, username: a.username, password: this.encryption.decrypt(a.encryptedPassword) },
        { from: { name: a.fromName, address: a.fromAddress }, replyTo: a.replyTo, to: address, subject, html: toEmailHtml(body, opts), text: toEmailText(body, opts), unsubscribeUrl: opts.unsubscribeUrl },
      );
      await this.repo.finishMessage(log.id, 'SENT', { providerMessageId: sent.messageId });
      await this.repo.setAccountStatus(orgId, 'ACTIVE', null);
      this.logger.log(`Test email sent org=${orgId} by=${userId}`);
      return { sentTo: address };
    } catch (err) {
      const reason = explain(err);
      await this.repo.finishMessage(log.id, 'FAILED', { error: reason });
      await this.repo.setAccountStatus(orgId, 'ERROR', reason);
      throw new BadRequestException(reason);
    }
  }

  async disconnect(orgId: string, userId: string) {
    await this.repo.deleteAccount(orgId);
    void this.audit.log({ orgId, userId, action: AuditAction.INTEGRATION_CONFIG_DELETED, targetType: 'EmailAccount', metadata: {} });
    return { ok: true };
  }

  recent(orgId: string) {
    return this.repo.recentMessages(orgId, 50);
  }

  private view(a: EmailAccount) {
    const today = new Date().toISOString().slice(0, 10);
    const counting = a.sentDay && a.sentDay.toISOString().slice(0, 10) === today;
    return {
      provider: a.provider,
      host: a.host,
      port: a.port,
      secure: a.secure,
      username: a.username,
      fromName: a.fromName,
      fromAddress: a.fromAddress,
      replyTo: a.replyTo,
      status: a.status,
      lastError: a.lastError,
      verifiedAt: a.verifiedAt,
      dailyLimit: a.dailyLimit,
      sentToday: counting ? a.sentToday : 0,
    };
  }
}
