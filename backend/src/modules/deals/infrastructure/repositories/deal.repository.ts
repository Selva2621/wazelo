import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { DealStatus, Prisma } from '@prisma/client';

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

  async findByIdAndOrg(id: string, orgId: string) {
    return this.prisma.deal.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        stage: true,
        contact: true,
        assignedTo: true,
        pipeline: true,
        product: true,
      },
    });
  }

  async updateStage(id: string, stageId: string, status?: DealStatus) {
    const data: Prisma.DealUpdateInput = { stage: { connect: { id: stageId } } };
    if (status === DealStatus.WON) {
      data.status = DealStatus.WON;
      data.closedAt = new Date();
    } else if (status === DealStatus.LOST) {
      data.status = DealStatus.LOST;
      data.closedAt = new Date();
    }
    return this.prisma.deal.update({
      where: { id },
      data,
      include: { stage: true, contact: true, assignedTo: true, product: true },
    });
  }

  async update(id: string, data: {
    title?: string;
    value?: number;
    currency?: string;
    expectedClose?: Date;
    notes?: string;
    assignedToId?: string;
    status?: DealStatus;
  }) {
    return this.prisma.deal.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.currency && { currency: data.currency }),
        ...(data.expectedClose && { expectedClose: data.expectedClose }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.assignedToId && { assignedToId: data.assignedToId }),
        ...(data.status && { status: data.status, ...(data.status !== DealStatus.OPEN && { closedAt: new Date() }) }),
      },
      include: { stage: true, contact: true, assignedTo: true, product: true },
    });
  }

  async softDelete(id: string) {
    return this.prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findByPipeline(orgId: string, pipelineId: string) {
    return this.prisma.deal.findMany({
      where: { orgId, pipelineId, deletedAt: null },
      include: { stage: true, contact: true, assignedTo: true, product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByContact(orgId: string, contactId: string) {
    return this.prisma.deal.findMany({
      where: { orgId, contactId, deletedAt: null },
      include: { stage: true, pipeline: true, contact: true, assignedTo: true, product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOpenByContact(orgId: string, contactId: string) {
    return this.prisma.deal.findFirst({
      where: { orgId, contactId, status: 'OPEN', deletedAt: null },
    });
  }

  async getAnalytics(orgId: string, pipelineId?: string) {
    const where: Prisma.DealWhereInput = { orgId, deletedAt: null };
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
