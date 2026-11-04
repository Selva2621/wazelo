import { Injectable } from '@nestjs/common';
import { EmailAccount, EmailMessage, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export type EmailSource = 'CAMPAIGN' | 'AUTOMATION' | 'SEQUENCE' | 'TEST';
export type EmailStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED';

/** The workspace's email account, its templates, and the log of every email sent. Always scoped by org. */
@Injectable()
export class EmailRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Account ─────────────────────────────────────────────────────────────────

  account(orgId: string): Promise<EmailAccount | null> {
    return this.prisma.emailAccount.findUnique({ where: { orgId } });
  }

  saveAccount(orgId: string, data: Omit<Prisma.EmailAccountUncheckedCreateInput, 'orgId'>) {
    return this.prisma.emailAccount.upsert({ where: { orgId }, create: { orgId, ...data }, update: data });
  }

  setAccountStatus(orgId: string, status: 'ACTIVE' | 'ERROR' | 'UNVERIFIED', lastError: string | null) {
    return this.prisma.emailAccount.updateMany({
      where: { orgId },
      data: { status, lastError: lastError?.slice(0, 500) ?? null, ...(status === 'ACTIVE' ? { verifiedAt: new Date() } : {}) },
    });
  }

  deleteAccount(orgId: string) {
    return this.prisma.emailAccount.deleteMany({ where: { orgId } });
  }

  /**
   * Counts one email against today's limit. False when the limit is reached
   * (nothing counted). A new UTC day starts the count again.
   */
  async takeDailySlot(orgId: string): Promise<boolean> {
    const today = new Date(new Date().toISOString().slice(0, 10));
    // New day: reset the counter (only once, whoever gets there first)
    await this.prisma.emailAccount.updateMany({
      where: { orgId, OR: [{ sentDay: null }, { sentDay: { lt: today } }] },
      data: { sentDay: today, sentToday: 0 },
    });
    const taken = await this.prisma.$executeRaw`
      UPDATE email_accounts SET sent_today = sent_today + 1
      WHERE org_id = ${orgId}::uuid AND sent_today < daily_limit`;
    return taken === 1;
  }

  // ── Templates ───────────────────────────────────────────────────────────────

  templates(orgId: string) {
    return this.prisma.emailTemplate.findMany({ where: { orgId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 200 });
  }

  /** Ever had an email template (deleted ones count): defaults are added only to new workspaces */
  async hadAnyTemplate(orgId: string): Promise<boolean> {
    return (await this.prisma.emailTemplate.count({ where: { orgId } })) > 0;
  }

  async createTemplates(orgId: string, userId: string, list: { name: string; subject: string; body: string }[]) {
    await this.prisma.emailTemplate.createMany({ data: list.map((t) => ({ orgId, createdById: userId, ...t })) });
  }

  async orgType(orgId: string): Promise<string | null> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { orgType: true } });
    return org?.orgType ?? null;
  }

  template(orgId: string, id: string) {
    return this.prisma.emailTemplate.findFirst({ where: { id, orgId, deletedAt: null } });
  }

  createTemplate(orgId: string, userId: string, data: { name: string; subject: string; body: string }) {
    return this.prisma.emailTemplate.create({ data: { orgId, createdById: userId, ...data } });
  }

  async updateTemplate(orgId: string, id: string, data: Partial<{ name: string; subject: string; body: string }>) {
    const r = await this.prisma.emailTemplate.updateMany({ where: { id, orgId, deletedAt: null }, data });
    return r.count === 1;
  }

  async deleteTemplate(orgId: string, id: string) {
    const r = await this.prisma.emailTemplate.updateMany({ where: { id, orgId, deletedAt: null }, data: { deletedAt: new Date() } });
    return r.count === 1;
  }

  // ── Log of emails ───────────────────────────────────────────────────────────

  findByKey(idempotencyKey: string) {
    return this.prisma.emailMessage.findUnique({ where: { idempotencyKey } });
  }

  createMessage(data: {
    orgId: string;
    contactId?: string | null;
    toAddress: string;
    subject: string;
    body: string;
    status: EmailStatus;
    error?: string | null;
    source: EmailSource;
    sourceId?: string | null;
    idempotencyKey: string;
  }): Promise<EmailMessage> {
    return this.prisma.emailMessage.create({ data: { ...data, error: data.error?.slice(0, 500) ?? null } });
  }

  message(id: string) {
    return this.prisma.emailMessage.findUnique({ where: { id } });
  }

  /** QUEUED → SENT / FAILED / SKIPPED. Only from QUEUED, so a retried job can't overwrite a result. */
  async finishMessage(id: string, status: Exclude<EmailStatus, 'QUEUED'>, data: { error?: string | null; providerMessageId?: string | null } = {}) {
    const r = await this.prisma.emailMessage.updateMany({
      where: { id, status: 'QUEUED' },
      data: {
        status,
        error: data.error?.slice(0, 500) ?? null,
        providerMessageId: data.providerMessageId?.slice(0, 255) ?? null,
        ...(status === 'SENT' ? { sentAt: new Date() } : {}),
      },
    });
    return r.count === 1;
  }

  countAttempt(id: string) {
    return this.prisma.emailMessage.update({ where: { id }, data: { attempts: { increment: 1 } }, select: { attempts: true } });
  }

  recentMessages(orgId: string, take = 50) {
    return this.prisma.emailMessage.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, toAddress: true, subject: true, status: true, error: true, source: true, sentAt: true, createdAt: true },
    });
  }

  // ── Contacts ────────────────────────────────────────────────────────────────

  contact(orgId: string, contactId: string) {
    return this.prisma.contact.findFirst({
      where: { id: contactId, orgId },
      select: { id: true, name: true, email: true, phoneNumber: true, emailOptedOut: true, deletedAt: true, mergedIntoId: true },
    });
  }

  async unsubscribe(orgId: string, contactId: string): Promise<boolean> {
    const r = await this.prisma.contact.updateMany({
      where: { id: contactId, orgId, emailOptedOut: false },
      data: { emailOptedOut: true, emailOptedOutAt: new Date() },
    });
    return r.count === 1;
  }

  businessName(orgId: string) {
    return this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
  }
}
