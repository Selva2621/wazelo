import { Injectable } from '@nestjs/common';
import { Prisma, ProposalStatus } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

const withPeople = {
  contact: { select: { id: true, name: true, phoneNumber: true } },
  deal: { select: { id: true, title: true, status: true, pipelineId: true, stageId: true } },
} satisfies Prisma.ProposalInclude;

export type ProposalWithPeople = Prisma.ProposalGetPayload<{ include: typeof withPeople }>;

export type ProposalCreate = Omit<Prisma.ProposalUncheckedCreateInput, 'number' | 'id'>;
export type ProposalUpdate = Pick<
  Prisma.ProposalUncheckedUpdateInput,
  | 'title' | 'intro' | 'scope' | 'items' | 'taxPercent' | 'discount' | 'subtotal' | 'total' | 'currency'
  | 'terms' | 'validUntil' | 'status' | 'sentAt' | 'respondedAt' | 'responseNote' | 'acceptedBy' | 'dealId'
>;

@Injectable()
export class ProposalRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates with the org's next number (P-0001, P-0002…); retries if two are created at once. */
  async create(data: ProposalCreate, attempt = 0): Promise<ProposalWithPeople> {
    const last = await this.prisma.proposal.findFirst({
      where: { orgId: data.orgId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    try {
      return await this.prisma.proposal.create({
        data: { ...data, number: (last?.number ?? 0) + 1 },
        include: withPeople,
      });
    } catch (err) {
      const numberTaken =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        String(err.meta?.target ?? '').includes('number');
      if (numberTaken && attempt < 3) return this.create(data, attempt + 1);
      throw err;
    }
  }

  findById(id: string, orgId: string): Promise<ProposalWithPeople | null> {
    return this.prisma.proposal.findFirst({ where: { id, orgId, deletedAt: null }, include: withPeople });
  }

  list(orgId: string, filter: { contactId?: string; dealId?: string; status?: ProposalStatus } = {}, take = 100) {
    return this.prisma.proposal.findMany({
      where: { orgId, deletedAt: null, ...filter },
      select: {
        id: true, number: true, title: true, status: true, total: true, currency: true,
        validUntil: true, sentAt: true, viewedAt: true, respondedAt: true, updatedAt: true,
        contact: { select: { id: true, name: true, phoneNumber: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  update(id: string, data: ProposalUpdate): Promise<ProposalWithPeople> {
    return this.prisma.proposal.update({ where: { id }, data, include: withPeople });
  }

  async softDelete(id: string, orgId: string): Promise<boolean> {
    const { count } = await this.prisma.proposal.updateMany({ where: { id, orgId, deletedAt: null }, data: { deletedAt: new Date() } });
    return count > 0;
  }

  orgBranding(orgId: string) {
    return this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, website: true, timezone: true } });
  }

  findContact(orgId: string, contactId: string) {
    return this.prisma.contact.findFirst({
      where: { id: contactId, orgId, deletedAt: null },
      select: { id: true, name: true, phoneNumber: true },
    });
  }

  findDeal(orgId: string, dealId: string) {
    return this.prisma.deal.findFirst({
      where: { id: dealId, orgId, deletedAt: null },
      select: {
        id: true, title: true, value: true, currency: true, contactId: true, status: true,
        pipelineId: true, stageId: true,
        product: { select: { name: true, price: true } },
      },
    });
  }

  /** The org's active products with prices, for the AI to price line items from. */
  catalog(orgId: string, take = 40) {
    return this.prisma.product.findMany({
      where: { orgId, deletedAt: null, status: 'ACTIVE' },
      select: { name: true, price: true, currency: true, description: true },
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  stagesOf(pipelineId: string) {
    return this.prisma.pipelineStage.findMany({
      where: { pipelineId },
      select: { id: true, name: true, order: true, isWonStage: true, isLostStage: true },
      orderBy: { order: 'asc' },
    });
  }

  /** A connected WhatsApp number to send from: the user's own first, else any of the org's. */
  async connectedSession(orgId: string, userId: string) {
    return (
      (await this.prisma.whatsAppSession.findFirst({
        where: { orgId, userId, deletedAt: null, status: 'CONNECTED' },
        orderBy: { lastActiveAt: 'desc' },
        select: { id: true },
      })) ??
      this.prisma.whatsAppSession.findFirst({
        where: { orgId, deletedAt: null, status: 'CONNECTED' },
        orderBy: { lastActiveAt: 'desc' },
        select: { id: true },
      })
    );
  }

  /** The client's view: the proposal plus the business it's from. */
  findByToken(publicToken: string) {
    return this.prisma.proposal.findFirst({
      where: { publicToken, deletedAt: null, status: { not: ProposalStatus.DRAFT } },
      include: {
        ...withPeople,
        organization: { select: { name: true, website: true, timezone: true } },
      },
    });
  }

  /**
   * Moves the proposal on only if it's still in one of `from` (so a double click,
   * or two tabs, can't accept twice). True when this call made the change.
   */
  async transition(id: string, from: ProposalStatus[], data: Prisma.ProposalUncheckedUpdateManyInput): Promise<boolean> {
    const { count } = await this.prisma.proposal.updateMany({ where: { id, status: { in: from }, deletedAt: null }, data });
    return count > 0;
  }
}
