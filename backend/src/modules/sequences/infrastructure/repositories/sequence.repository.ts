import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { SequenceRecipientStatus, SequenceStatus, CampaignRecipientStatus } from '@prisma/client';

@Injectable()
export class SequenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ─── Sequence CRUD ─── */

  async create(data: {
    orgId: string;
    sessionId: string;
    name: string;
    description?: string;
    audienceType: 'ALL' | 'FILTERED';
    audienceFilters?: Record<string, unknown>;
    exitOnReply?: boolean;
    createdById: string;
  }) {
    return this.prisma.campaignSequence.create({
      data: data as any,
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  async findByIdAndOrg(id: string, orgId: string) {
    return this.prisma.campaignSequence.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findByOrgPaginated(orgId: string, params: {
    status?: SequenceStatus;
    take?: number;
    skip?: number;
  }) {
    const where = { orgId, deletedAt: null, ...(params.status && { status: params.status }) };
    const [data, total] = await Promise.all([
      this.prisma.campaignSequence.findMany({
        where,
        include: {
          steps: { orderBy: { stepOrder: 'asc' }, select: { id: true, stepOrder: true, name: true, delayMinutes: true, messageType: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: params.take ?? 20,
        skip: params.skip ?? 0,
      }),
      this.prisma.campaignSequence.count({ where }),
    ]);
    return { data, total };
  }

  async updateStatus(id: string, orgId: string, status: SequenceStatus, extra?: Record<string, unknown>) {
    return this.prisma.campaignSequence.updateMany({
      where: { id, orgId },
      data: { status, ...extra },
    });
  }

  async softDelete(id: string, orgId: string) {
    return this.prisma.campaignSequence.updateMany({
      where: { id, orgId },
      data: { deletedAt: new Date() },
    });
  }

  /* ─── Steps ─── */

  async addStep(data: {
    sequenceId: string;
    orgId: string;
    stepOrder: number;
    name?: string;
    messageType?: string;
    messageBody?: string;
    mediaUrl?: string;
    mediaMimeType?: string;
    delayMinutes?: number;
  }) {
    return this.prisma.campaignSequenceStep.create({ data: data as any });
  }

  async updateStep(stepId: string, orgId: string, data: Partial<{
    name: string;
    messageBody: string;
    mediaUrl: string | null;
    mediaMimeType: string | null;
    delayMinutes: number;
    messageType: string;
  }>) {
    return this.prisma.campaignSequenceStep.updateMany({
      where: { id: stepId, orgId },
      data: data as any,
    });
  }

  async deleteStep(stepId: string, orgId: string) {
    return this.prisma.campaignSequenceStep.deleteMany({
      where: { id: stepId, orgId },
    });
  }

  async getStepsBySequence(sequenceId: string) {
    return this.prisma.campaignSequenceStep.findMany({
      where: { sequenceId },
      orderBy: { stepOrder: 'asc' },
    });
  }

  /* ─── Recipients ─── */

  async bulkEnrollRecipients(records: Array<{
    sequenceId: string;
    orgId: string;
    contactId: string;
    contactPhone: string;
    nextStepAt: Date;
  }>) {
    return this.prisma.sequenceRecipient.createMany({
      data: records,
      skipDuplicates: true,
    });
  }

  async getActiveRecipientsForStep(orgId: string | undefined, beforeDate: Date, take = 100) {
    const where: any = {
      status: SequenceRecipientStatus.ACTIVE,
      nextStepAt: { lte: beforeDate },
    };
    if (orgId) where.orgId = orgId;

    return this.prisma.sequenceRecipient.findMany({
      where,
      include: {
        sequence: { select: { id: true, sessionId: true, status: true, exitOnReply: true } },
      },
      take,
      orderBy: { nextStepAt: 'asc' },
    });
  }

  async advanceRecipient(recipientId: string, newStep: number, nextStepAt: Date | null) {
    return this.prisma.sequenceRecipient.update({
      where: { id: recipientId },
      data: {
        currentStep: newStep,
        nextStepAt,
      },
    });
  }

  async jumpRecipientToStep(recipientId: string, stepOrder: number, delayMinutes: number) {
    return this.prisma.sequenceRecipient.update({
      where: { id: recipientId },
      data: {
        currentStep: stepOrder,
        nextStepAt: new Date(Date.now() + delayMinutes * 60 * 1000),
      },
    });
  }

  async exitRecipient(recipientId: string, reason: string) {
    return this.prisma.sequenceRecipient.update({
      where: { id: recipientId },
      data: {
        status: SequenceRecipientStatus.EXITED,
        exitReason: reason,
        completedAt: new Date(),
        nextStepAt: null,
      },
    });
  }

  async completeRecipient(recipientId: string) {
    return this.prisma.sequenceRecipient.update({
      where: { id: recipientId },
      data: {
        status: SequenceRecipientStatus.COMPLETED,
        completedAt: new Date(),
        nextStepAt: null,
      },
    });
  }

  async createRecipientStep(data: {
    recipientId: string;
    stepId: string;
    orgId: string;
    scheduledAt: Date;
  }) {
    return this.prisma.sequenceRecipientStep.create({ data });
  }

  async updateRecipientStepStatus(id: string, status: CampaignRecipientStatus, extra?: Record<string, unknown>) {
    return this.prisma.sequenceRecipientStep.update({
      where: { id },
      data: { status, ...extra } as any,
    });
  }

  async updateSequenceCounters(sequenceId: string) {
    const [total, completed, exited] = await Promise.all([
      this.prisma.sequenceRecipient.count({ where: { sequenceId } }),
      this.prisma.sequenceRecipient.count({ where: { sequenceId, status: SequenceRecipientStatus.COMPLETED } }),
      this.prisma.sequenceRecipient.count({ where: { sequenceId, status: SequenceRecipientStatus.EXITED } }),
    ]);
    return this.prisma.campaignSequence.updateMany({
      where: { id: sequenceId },
      data: { totalRecipients: total, completedCount: completed, exitedCount: exited },
    });
  }

  /** Find recipients in a sequence by contact phone (for exit-on-reply). */
  async findActiveRecipientByContact(contactId: string, orgId: string) {
    return this.prisma.sequenceRecipient.findMany({
      where: {
        contactId,
        orgId,
        status: SequenceRecipientStatus.ACTIVE,
      },
      include: {
        sequence: {
          select: {
            exitOnReply: true,
            steps: { orderBy: { stepOrder: 'asc' }, select: { stepOrder: true, conditions: true, delayMinutes: true } },
          },
        },
      },
    });
  }

  async getRecipients(sequenceId: string, orgId: string, take = 50, skip = 0) {
    const where = { sequenceId, orgId };
    const [data, total] = await Promise.all([
      this.prisma.sequenceRecipient.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, phoneNumber: true } },
          steps: { orderBy: { scheduledAt: 'asc' } },
        },
        orderBy: { enrolledAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.sequenceRecipient.count({ where }),
    ]);
    return { data, total };
  }

  /* ─── Analytics ─── */

  async getAnalytics(sequenceId: string, orgId: string) {
    const where = { sequenceId, orgId };

    const [recipientStatusCounts, stepFunnel, exitReasons, completedRecipients] = await Promise.all([
      // 1. Recipient counts by status
      this.prisma.sequenceRecipient.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      // 2. Step funnel — how many recipients reached each step
      this.prisma.sequenceRecipientStep.groupBy({
        by: ['stepId'],
        where: { orgId, recipient: { sequenceId } },
        _count: true,
      }),
      // 3. Exit reasons breakdown
      this.prisma.sequenceRecipient.groupBy({
        by: ['exitReason'],
        where: { ...where, status: SequenceRecipientStatus.EXITED },
        _count: true,
      }),
      // 4. For avg completion time
      this.prisma.sequenceRecipient.findMany({
        where: { ...where, status: SequenceRecipientStatus.COMPLETED, completedAt: { not: null } },
        select: { enrolledAt: true, completedAt: true },
      }),
    ]);

    // Get steps for funnel labels
    const steps = await this.prisma.campaignSequenceStep.findMany({
      where: { sequenceId },
      orderBy: { stepOrder: 'asc' },
      select: { id: true, stepOrder: true, name: true },
    });

    const stepFunnelMap = new Map(stepFunnel.map((s) => [s.stepId, s._count]));

    // Calculate avg completion time in hours
    let avgCompletionHours: number | null = null;
    if (completedRecipients.length > 0) {
      const totalMs = completedRecipients.reduce((sum, r) => {
        return sum + (r.completedAt!.getTime() - r.enrolledAt.getTime());
      }, 0);
      avgCompletionHours = Math.round((totalMs / completedRecipients.length) / (1000 * 60 * 60) * 10) / 10;
    }

    // Total
    const total = recipientStatusCounts.reduce((sum, s) => sum + s._count, 0);
    const statusMap = new Map(recipientStatusCounts.map((s) => [s.status, s._count]));
    const repliedCount = exitReasons.find((e) => e.exitReason === 'Contact replied')?._count || 0;

    return {
      totalRecipients: total,
      activeCount: statusMap.get(SequenceRecipientStatus.ACTIVE) || 0,
      completedCount: statusMap.get(SequenceRecipientStatus.COMPLETED) || 0,
      exitedCount: statusMap.get(SequenceRecipientStatus.EXITED) || 0,
      replyRate: total > 0 ? Math.round((repliedCount / total) * 1000) / 10 : 0,
      avgCompletionHours,
      stepFunnel: steps.map((s) => ({
        stepOrder: s.stepOrder,
        name: s.name || `Step ${s.stepOrder + 1}`,
        reached: stepFunnelMap.get(s.id) || 0,
      })),
      exitReasons: exitReasons.map((e) => ({
        reason: e.exitReason || 'Unknown',
        count: e._count,
      })),
    };
  }
}
