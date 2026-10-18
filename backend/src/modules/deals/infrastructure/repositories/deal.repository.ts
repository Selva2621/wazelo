import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { DealStatus, Prisma } from '@prisma/client';

/**
 * Which deals a user may see: undefined = whole org (admin), otherwise deals
 * whose contact is owned by, or which are assigned to, one of these users.
 */
export type DealScope = { userIds: string[] } | undefined;

/** Deals of a deleted pipeline are gone with it */
const LIVE: Prisma.DealWhereInput = { deletedAt: null, pipeline: { deletedAt: null } };

function scopeWhere(scope: DealScope): Prisma.DealWhereInput {
  if (!scope) return {};
  return {
    OR: [
      { contact: { ownerId: { in: scope.userIds } } },
      { assignedToId: { in: scope.userIds } },
    ],
  };
}

@Injectable()
export class DealRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    orgId: string;
    pipelineId: string;
    stageId: string;
    contactId: string;
    assignedToId?: string;
    title: string;
    value?: number;
    currency?: string;
    expectedClose?: Date;
    notes?: string;
    productId?: string;
  }) {
    return this.prisma.deal.create({
      data: {
        orgId: data.orgId,
        pipelineId: data.pipelineId,
        stageId: data.stageId,
        contactId: data.contactId,
        assignedToId: data.assignedToId || null,
        title: data.title,
        value: data.value ?? null,
        currency: data.currency || 'INR',
        expectedClose: data.expectedClose || null,
        notes: data.notes || null,
        productId: data.productId || null,
      },
      include: { stage: true, contact: true, assignedTo: true, product: true },
    });
  }

  async findByIdAndOrg(id: string, orgId: string, scope?: DealScope) {
    return this.prisma.deal.findFirst({
      where: { id, orgId, ...LIVE, ...scopeWhere(scope) },
      include: {
        stage: true,
        contact: true,
        assignedTo: true,
        pipeline: true,
        product: true,
      },
    });
  }

  /**
   * Names of referenced records that don't exist in this org (or, for the
   * stage, aren't in the given pipeline). Empty when everything is valid.
   */
  async findInvalidRefs(orgId: string, refs: {
    pipelineId: string;
    stageId: string;
    contactId?: string;
    assignedToId?: string;
    productId?: string;
  }, scope?: DealScope): Promise<string[]> {
    const [pipeline, stage, contact, assignee, product] = await Promise.all([
      this.prisma.pipeline.findFirst({ where: { id: refs.pipelineId, orgId, deletedAt: null }, select: { id: true } }),
      this.prisma.pipelineStage.findFirst({ where: { id: refs.stageId, pipelineId: refs.pipelineId }, select: { id: true } }),
      refs.contactId
        ? this.prisma.contact.findFirst({
            where: {
              id: refs.contactId,
              orgId,
              deletedAt: null,
              // Only a contact the user can see
              ...(scope && { ownerId: { in: scope.userIds } }),
            },
            select: { id: true },
          })
        : Promise.resolve({ id: '' }),
      refs.assignedToId
        ? this.prisma.user.findFirst({ where: { id: refs.assignedToId, orgId, deletedAt: null }, select: { id: true } })
        : Promise.resolve({ id: '' }),
      refs.productId
        ? this.prisma.product.findFirst({ where: { id: refs.productId, orgId, deletedAt: null }, select: { id: true } })
        : Promise.resolve({ id: '' }),
    ]);

    const invalid: string[] = [];
    if (!pipeline) invalid.push('pipeline');
    if (!pipeline || !stage) invalid.push('stage');
    if (!contact) invalid.push('contact');
    if (!assignee) invalid.push('assignee');
    if (!product) invalid.push('product');
    return invalid;
  }

  /**
   * Move a deal to a stage. Status follows the stage's won/lost flags, so moving
   * a closed deal back to an open stage reopens it (status OPEN, closedAt cleared).
   */
  async updateStage(id: string, stage: { id: string; isWonStage: boolean; isLostStage: boolean }) {
    const status = stage.isWonStage ? DealStatus.WON : stage.isLostStage ? DealStatus.LOST : DealStatus.OPEN;
    const data: Prisma.DealUpdateInput = {
      stage: { connect: { id: stage.id } },
      status,
      closedAt: status === DealStatus.OPEN ? null : new Date(),
    };
    return this.prisma.deal.update({
      where: { id },
      data,
      include: { stage: true, contact: true, assignedTo: true, product: true },
    });
  }

  async update(id: string, data: {
    title?: string;
    /** null clears the value */
    value?: number | null;
    currency?: string;
    expectedClose?: Date;
    notes?: string;
    assignedToId?: string;
    status?: DealStatus;
    /** null clears the follow-up */
    nextFollowUpAt?: Date | null;
    followUpNote?: string | null;
  }) {
    return this.prisma.deal.update({
      where: { id },
      data: {
        ...(data.nextFollowUpAt !== undefined && {
          nextFollowUpAt: data.nextFollowUpAt,
          // A new or cleared time gets a fresh "due" notification
          followUpNotifiedAt: null,
        }),
        ...(data.followUpNote !== undefined && { followUpNote: data.followUpNote }),
        ...(data.title && { title: data.title }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.currency && { currency: data.currency }),
        ...(data.expectedClose && { expectedClose: data.expectedClose }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.assignedToId && { assignedToId: data.assignedToId }),
        ...(data.status && {
          status: data.status,
          closedAt: data.status === DealStatus.OPEN ? null : new Date(),
        }),
      },
      include: { stage: true, contact: true, assignedTo: true, product: true },
    });
  }

  /** Open deals with a follow-up due at or before `until` (overdue first). */
  async findFollowUpsDue(orgId: string, until: Date, scope?: DealScope, take = 50) {
    return this.prisma.deal.findMany({
      where: {
        orgId,
        ...LIVE,
        ...scopeWhere(scope),
        status: DealStatus.OPEN,
        nextFollowUpAt: { not: null, lte: until },
      },
      include: {
        stage: { select: { id: true, name: true, color: true } },
        contact: { select: { id: true, name: true, phoneNumber: true } },
      },
      orderBy: { nextFollowUpAt: 'asc' },
      take,
    });
  }

  /** Follow-ups that just came due and haven't been notified yet — all orgs. */
  async findFollowUpsToNotify(now: Date, take = 200) {
    return this.prisma.deal.findMany({
      where: {
        ...LIVE,
        status: DealStatus.OPEN,
        nextFollowUpAt: { not: null, lte: now },
        followUpNotifiedAt: null,
      },
      select: {
        id: true,
        orgId: true,
        pipelineId: true,
        title: true,
        assignedToId: true,
        nextFollowUpAt: true,
        followUpNote: true,
        contact: { select: { id: true, name: true, phoneNumber: true, ownerId: true } },
      },
      take,
    });
  }

  async markFollowUpNotified(id: string, at: Date) {
    return this.prisma.deal.update({ where: { id }, data: { followUpNotifiedAt: at } });
  }

  async softDelete(id: string) {
    return this.prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findByPipeline(orgId: string, pipelineId: string, scope?: DealScope) {
    return this.prisma.deal.findMany({
      where: { orgId, pipelineId, ...LIVE, ...scopeWhere(scope) },
      include: { stage: true, contact: true, assignedTo: true, product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByContact(orgId: string, contactId: string, scope?: DealScope) {
    return this.prisma.deal.findMany({
      where: { orgId, contactId, ...LIVE, ...scopeWhere(scope) },
      include: { stage: true, pipeline: true, contact: true, assignedTo: true, product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOpenByContact(orgId: string, contactId: string) {
    return this.prisma.deal.findFirst({
      where: { orgId, contactId, status: 'OPEN', ...LIVE },
    });
  }

  async getAnalytics(orgId: string, pipelineId?: string, scope?: DealScope) {
    const where: Prisma.DealWhereInput = { orgId, ...LIVE, ...scopeWhere(scope) };
    if (pipelineId) where.pipelineId = pipelineId;

    const [totalDeals, totalValue, byStatus, byStage] = await Promise.all([
      this.prisma.deal.count({ where }),
      this.prisma.deal.aggregate({ where, _sum: { value: true } }),
      this.prisma.deal.groupBy({ by: ['status'], where, _count: true, _sum: { value: true } }),
      this.prisma.deal.groupBy({ by: ['stageId'], where, _count: true, _sum: { value: true } }),
    ]);

    return {
      totalDeals,
      totalValue: totalValue._sum.value ?? 0,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
        value: s._sum.value ?? 0,
      })),
      byStage: byStage.map((s) => ({
        stageId: s.stageId,
        count: s._count,
        value: s._sum.value ?? 0,
      })),
    };
  }
}
