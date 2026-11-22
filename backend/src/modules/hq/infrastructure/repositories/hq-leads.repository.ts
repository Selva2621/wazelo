import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { HQ_CUSTOMER_PIPELINE } from '../../domain/services/signup-lead';
import { HQ_DEFAULT_TEMPLATES, hqTemplateRows, sendableTemplateStatus } from '../../domain/services/platform-alerts';

/** Contact metadata key that links an HQ contact to the customer's Wazelo org */
const ORG_LINK_KEY = 'wazeloOrgId';

function asObject(value: Prisma.JsonValue | null): Prisma.JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Prisma.JsonObject) : {};
}

@Injectable()
export class HqLeadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findHqId(): Promise<string | null> {
    const hq = await this.prisma.organization.findFirst({
      where: { isInternal: true, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });
    return hq?.id ?? null;
  }

  /** The person who signed up, with their org */
  findSignup(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        orgId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        whatsappOptInAt: true,
        superAdminId: true,
        organization: { select: { name: true, isInternal: true } },
      },
    });
  }

  /** The customer org's newest subscription, whatever its status */
  latestSubscription(orgId: string) {
    return this.prisma.subscription.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      select: { status: true, priceInCents: true, plan: { select: { name: true } } },
    });
  }

  /** HQ admins and managers: who hears about a new sign-up */
  async findTeamIds(hqId: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { orgId: hqId, role: { in: ['ADMIN', 'MANAGER'] }, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  findContactForOrg(hqId: string, customerOrgId: string) {
    return this.prisma.contact.findFirst({
      where: { orgId: hqId, deletedAt: null, metadata: { path: [ORG_LINK_KEY], equals: customerOrgId } },
      select: { id: true, name: true, ownerId: true, metadata: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Links the contact to the customer org (merged into its metadata) and fills a missing email. */
  async linkContact(
    contactId: string,
    link: { customerOrgId: string; customerUserId: string; orgName: string; plan: string | null },
    email: string,
  ): Promise<void> {
    const current = await this.prisma.contact.findUnique({ where: { id: contactId }, select: { metadata: true } });
    await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        metadata: {
          ...asObject(current?.metadata ?? null),
          from: 'wazelo-signup',
          [ORG_LINK_KEY]: link.customerOrgId,
          wazeloUserId: link.customerUserId,
          wazeloOrgName: link.orgName,
          wazeloPlan: link.plan,
        },
      },
    });
    await this.prisma.contact.updateMany({ where: { id: contactId, email: null }, data: { email } });
  }

  /** The customer's current plan name on the HQ contact (other metadata kept). */
  async updatePlan(contactId: string, plan: string | null): Promise<void> {
    const current = await this.prisma.contact.findUnique({ where: { id: contactId }, select: { metadata: true } });
    const metadata = asObject(current?.metadata ?? null);
    if (metadata.wazeloPlan === plan) return;
    await this.prisma.contact.update({ where: { id: contactId }, data: { metadata: { ...metadata, wazeloPlan: plan } } });
  }

  async recordConsent(hqId: string, contactId: string, agreedAt: Date): Promise<void> {
    const already = await this.prisma.consentRecord.count({
      where: { orgId: hqId, contactId, consentType: 'messaging', source: 'wazelo_signup', revokedAt: null },
    });
    if (already) return;
    await this.prisma.consentRecord.create({
      data: {
        orgId: hqId,
        contactId,
        consentType: 'messaging',
        granted: true,
        source: 'wazelo_signup',
        grantedAt: agreedAt,
        metadata: { channels: ['WHATSAPP'], text: 'Send me account updates on WhatsApp' },
      },
    });
  }

  /** HQ's "Wazelo customers" pipeline, created the first time it is needed. */
  async ensureCustomerPipeline(hqId: string) {
    const include = { stages: { orderBy: { order: 'asc' as const } } };
    const existing = await this.prisma.pipeline.findFirst({
      where: { orgId: hqId, name: HQ_CUSTOMER_PIPELINE.name, deletedAt: null },
      include,
    });
    if (existing) return existing;
    return this.prisma.pipeline.create({
      data: {
        orgId: hqId,
        name: HQ_CUSTOMER_PIPELINE.name,
        description: HQ_CUSTOMER_PIPELINE.description,
        isDefault: false,
        stages: {
          create: HQ_CUSTOMER_PIPELINE.stages.map((s) => ({
            name: s.name,
            order: s.order,
            color: s.color,
            isWonStage: s.isWonStage,
            isLostStage: s.isLostStage,
          })),
        },
      },
      include,
    });
  }

  async findOrgType(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { orgType: true } });
    return org?.orgType ?? null;
  }

  /** Names of the contact's tags */
  async contactTagNames(contactId: string): Promise<{ id: string; name: string }[]> {
    const rows = await this.prisma.contactTag.findMany({
      where: { contactId, tag: { deletedAt: null } },
      select: { tag: { select: { id: true, name: true } } },
    });
    return rows.map((r) => r.tag);
  }

  // ─── Platform alerts ───

  /** HQ's connected WhatsApp number (the most recently active one) */
  async findHqSessionId(hqId: string): Promise<string | null> {
    const s = await this.prisma.whatsAppSession.findFirst({
      where: { orgId: hqId, deletedAt: null, status: 'CONNECTED' },
      orderBy: { lastActiveAt: 'desc' },
      select: { id: true },
    });
    return s?.id ?? null;
  }

  /** Provider of HQ's sending number (QR when none is connected yet) */
  private async hqProvider(hqId: string): Promise<string> {
    const s = await this.prisma.whatsAppSession.findFirst({
      where: { orgId: hqId, deletedAt: null, status: 'CONNECTED' },
      orderBy: { lastActiveAt: 'desc' },
      select: { provider: true },
    });
    return s?.provider ?? 'QR';
  }

  /** An HQ template by exact name that HQ's number can send (see sendableTemplateStatus) */
  async findSendableTemplate(hqId: string, name: string) {
    return this.prisma.messageTemplate.findFirst({
      where: { orgId: hqId, name, deletedAt: null, ...sendableTemplateStatus(await this.hqProvider(hqId)) },
      select: { name: true, language: true, components: true, status: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Names among `names` that HQ's number can send (setup status) */
  async sendableTemplateNames(hqId: string, names: string[]): Promise<Set<string>> {
    const rows = await this.prisma.messageTemplate.findMany({
      where: { orgId: hqId, name: { in: names }, deletedAt: null, ...sendableTemplateStatus(await this.hqProvider(hqId)) },
      select: { name: true },
    });
    return new Set(rows.map((r) => r.name));
  }

  /**
   * Creates HQ's default templates that are missing. A name that ever existed (even
   * deleted) is skipped, so a template the team deleted or renamed stays as they left it.
   */
  async seedDefaultTemplates(hqId: string): Promise<string[]> {
    const existing = await this.prisma.messageTemplate.findMany({
      where: { orgId: hqId, name: { in: HQ_DEFAULT_TEMPLATES.map((t) => t.name) } },
      select: { name: true },
    });
    const have = new Set(existing.map((r) => r.name));
    const missing = HQ_DEFAULT_TEMPLATES.filter((t) => !have.has(t.name));
    if (missing.length) await this.prisma.messageTemplate.createMany({ data: hqTemplateRows(hqId, missing) });
    return missing.map((t) => t.name);
  }

  /**
   * Who gets a platform alert for a customer workspace: the HQ contact linked to it,
   * with the person's first name and whether they may be messaged on WhatsApp.
   */
  async alertRecipient(hqId: string, customerOrgId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { orgId: hqId, deletedAt: null, metadata: { path: [ORG_LINK_KEY], equals: customerOrgId } },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        optedOut: true,
        metadata: true,
        consentRecords: { where: { consentType: 'messaging', granted: true, revokedAt: null }, select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!contact) return null;
    const org = await this.prisma.organization.findUnique({ where: { id: customerOrgId }, select: { name: true } });
    return {
      contactId: contact.id,
      phone: contact.phoneNumber,
      firstName: (contact.name ?? '').trim().split(/\s+/)[0] || 'there',
      orgName: org?.name ?? String(asObject(contact.metadata).wazeloOrgName ?? ''),
      mayMessage: !contact.optedOut && contact.consentRecords.length > 0,
    };
  }

  /** Trials ending within [from, to) — for the "trial ending" reminders */
  trialsEndingBetween(from: Date, to: Date) {
    return this.prisma.subscription.findMany({
      where: { status: 'TRIAL', trialEndsAt: { gte: from, lt: to }, organization: { isInternal: false, deletedAt: null } },
      select: { id: true, orgId: true, trialEndsAt: true },
    });
  }

  // ─── Sign-up WhatsApp number check ───

  findUserPhone(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, orgId: true, phone: true, phoneVerifiedAt: true, firstName: true },
    });
  }

  async verificationsSentSince(userId: string, since: Date): Promise<Date[]> {
    const rows = await this.prisma.phoneVerification.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    });
    return rows.map((r) => r.createdAt);
  }

  createVerification(data: { userId: string; phone: string; codeHash: string; expiresAt: Date }) {
    return this.prisma.phoneVerification.create({ data, select: { id: true } });
  }

  /** The newest code for this user and number that can still be used */
  latestOpenVerification(userId: string, phone: string) {
    return this.prisma.phoneVerification.findFirst({
      where: { userId, phone, verifiedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, codeHash: true, attempts: true },
    });
  }

  /** One more wrong try; returns the new count */
  async addAttempt(id: string): Promise<number> {
    const row = await this.prisma.phoneVerification.update({
      where: { id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    return row.attempts;
  }

  /** Code used and the user's number marked verified — only if the number is still the same */
  async markVerified(id: string, userId: string, phone: string): Promise<boolean> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const used = await tx.phoneVerification.updateMany({ where: { id, verifiedAt: null }, data: { verifiedAt: now } });
      if (used.count !== 1) return false;
      const user = await tx.user.updateMany({ where: { id: userId, phone }, data: { phoneVerifiedAt: now } });
      return user.count === 1;
    });
  }

  /** The contact's deal in the customers pipeline (open or closed) */
  findDeal(hqId: string, pipelineId: string, contactId: string) {
    return this.prisma.deal.findFirst({
      where: { orgId: hqId, pipelineId, contactId, deletedAt: null },
      select: { id: true, pipelineId: true, stageId: true, status: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
