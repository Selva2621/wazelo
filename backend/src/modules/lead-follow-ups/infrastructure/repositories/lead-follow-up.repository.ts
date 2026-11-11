import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { HandlerLoad } from '../../domain/services/pick-assignee';

export type TouchVia = 'MESSAGE' | 'STATUS' | 'CALLED';

@Injectable()
export class LeadFollowUpRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** What decides a lead's owner: the product, its team and reminder time */
  findProduct(productId: string, orgId: string) {
    return this.prisma.product.findFirst({
      where: { id: productId, orgId, deletedAt: null },
      select: { id: true, name: true, leadHandlerIds: true, leadReminderMinutes: true },
    });
  }

  /** The team members who can still take leads, in team order */
  async activeUserIds(orgId: string, userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const rows = await this.prisma.user.findMany({
      where: { id: { in: userIds }, orgId, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });
    const active = new Set(rows.map((r) => r.id));
    return userIds.filter((id) => active.has(id));
  }

  /** Leads waiting for contact, and the last one given, for each team member */
  async loads(orgId: string, userIds: string[]): Promise<HandlerLoad[]> {
    const [open, last] = await Promise.all([
      this.prisma.leadFollowUp.groupBy({
        by: ['assigneeId'],
        where: { orgId, assigneeId: { in: userIds }, touchedAt: null },
        _count: { _all: true },
      }),
      this.prisma.leadFollowUp.groupBy({
        by: ['assigneeId'],
        where: { orgId, assigneeId: { in: userIds } },
        _max: { createdAt: true },
      }),
    ]);
    const openBy = new Map(open.map((r) => [r.assigneeId, r._count._all]));
    const lastBy = new Map(last.map((r) => [r.assigneeId, r._max.createdAt]));
    return userIds.map((userId) => ({
      userId,
      open: openBy.get(userId) ?? 0,
      lastAssignedAt: lastBy.get(userId) ?? null,
    }));
  }

  findContact(contactId: string, orgId: string) {
    return this.prisma.contact.findFirst({
      where: { id: contactId, orgId, deletedAt: null },
      select: { id: true, name: true, phoneNumber: true, ownerId: true },
    });
  }

  /** One follow-up per lead and product: a repeated webhook doesn't create a second */
  async create(data: {
    orgId: string;
    contactId: string;
    productId: string;
    assigneeId: string;
    leadgenId?: string;
    dueAt: Date;
  }) {
    if (data.leadgenId) {
      const existing = await this.prisma.leadFollowUp.findFirst({
        where: { orgId: data.orgId, leadgenId: data.leadgenId, productId: data.productId },
      });
      if (existing) return { followUp: existing, created: false };
    }
    const followUp = await this.prisma.leadFollowUp.create({
      data: {
        orgId: data.orgId,
        contactId: data.contactId,
        productId: data.productId,
        assigneeId: data.assigneeId,
        leadgenId: data.leadgenId ?? null,
        dueAt: data.dueAt,
      },
    });
    return { followUp, created: true };
  }

  setContactOwner(contactId: string, ownerId: string) {
    return this.prisma.contact.update({ where: { id: contactId }, data: { ownerId } });
  }

  findById(id: string, orgId: string) {
    return this.prisma.leadFollowUp.findFirst({ where: { id, orgId } });
  }

  /** Someone contacted the lead: close every open follow-up for this contact */
  async touchContact(orgId: string, contactId: string, userId: string | null, via: TouchVia) {
    const result = await this.prisma.leadFollowUp.updateMany({
      where: { orgId, contactId, touchedAt: null },
      data: { touchedAt: new Date(), touchedById: userId, touchedVia: via },
    });
    return result.count;
  }

  /** Leads past their reminder time that nobody has contacted and nobody was reminded about */
  findDueToRemind(now: Date) {
    return this.prisma.leadFollowUp.findMany({
      where: { dueAt: { lte: now }, touchedAt: null, remindedAt: null },
      orderBy: { dueAt: 'asc' },
      take: 200,
      include: {
        contact: { select: { id: true, name: true, phoneNumber: true } },
        product: { select: { name: true, leadReminderMinutes: true } },
      },
    });
  }

  markReminded(id: string) {
    return this.prisma.leadFollowUp.update({ where: { id }, data: { remindedAt: new Date() } });
  }

  /** The contact a chat is with (a manual reply there counts as contacting the lead) */
  async contactIdForConversation(orgId: string, conversationId: string): Promise<string | null> {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, orgId },
      select: { contactId: true, contactPhone: true },
    });
    if (!conv) return null;
    if (conv.contactId) return conv.contactId;
    if (!conv.contactPhone) return null;
    const contact = await this.prisma.contact.findFirst({
      where: { orgId, phoneNumber: conv.contactPhone, deletedAt: null },
      select: { id: true },
    });
    return contact?.id ?? null;
  }

  // ─── Day-end brand summary ───

  /** Brands with a manager, and their org's time zone */
  findBrandsWithManagers() {
    return this.prisma.brand.findMany({
      where: { deletedAt: null, managerId: { not: null } },
      select: {
        id: true,
        orgId: true,
        name: true,
        managerId: true,
        lastSummaryDate: true,
        organization: { select: { timezone: true } },
      },
    });
  }

  /** The brand's leads that came in between `from` and `to`, oldest first, with the assignee's name */
  async leadsForBrand(orgId: string, brandId: string, from: Date, to: Date) {
    const rows = await this.prisma.leadFollowUp.findMany({
      where: { orgId, createdAt: { gte: from, lt: to }, product: { brandId } },
      orderBy: { createdAt: 'asc' },
      include: {
        contact: { select: { name: true, phoneNumber: true } },
        product: { select: { name: true } },
      },
    });
    const assigneeIds = [...new Set(rows.map((r) => r.assigneeId))];
    const users = assigneeIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const names = new Map(users.map((u) => [u.id, `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || null]));
    return rows.map((r) => ({
      contactName: r.contact.name,
      contactPhone: r.contact.phoneNumber,
      productName: r.product?.name ?? null,
      assigneeName: names.get(r.assigneeId) ?? null,
      dueAt: r.dueAt,
      touchedAt: r.touchedAt,
    }));
  }

  markSummarySent(brandId: string, localDate: string) {
    return this.prisma.brand.update({ where: { id: brandId }, data: { lastSummaryDate: localDate } });
  }

  /** A person's leads still waiting for contact, oldest first */
  findOpenForAssignee(orgId: string, assigneeId: string) {
    return this.prisma.leadFollowUp.findMany({
      where: { orgId, assigneeId, touchedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        contact: { select: { id: true, name: true, phoneNumber: true } },
        product: { select: { id: true, name: true } },
      },
    });
  }
}
