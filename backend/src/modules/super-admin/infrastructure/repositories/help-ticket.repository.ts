import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Prisma, TicketStatus, TicketCategory, TicketPriority } from '@prisma/client';

export interface CreateTicketInput {
  orgId: string;
  userId: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  attachmentUrl?: string;
}

export interface ListTicketsFilter {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  orgId?: string;
  /** Super admin queue only: a super admin id, or null for unassigned */
  assignedToId?: string | null;
}

const ASSIGNEE_SELECT = { select: { id: true, name: true, email: true } } as const;

@Injectable()
export class HelpTicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTicketInput) {
    return this.prisma.helpTicket.create({
      data: {
        orgId: input.orgId,
        userId: input.userId,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority ?? 'MEDIUM',
        ...(input.attachmentUrl ? { attachmentUrl: input.attachmentUrl } : {}),
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  /**
   * @param includeInternal true only for super admins — internal notes must
   *   never reach the tenant.
   */
  async findById(id: string, includeInternal = false) {
    return this.prisma.helpTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        organization: { select: { id: true, name: true, slug: true } },
        assignedTo: ASSIGNEE_SELECT,
        replies: {
          where: includeInternal ? {} : { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            superAdmin: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /** Tenant view: their own org only, internal notes not counted. */
  async findByOrg(orgId: string, filter: ListTicketsFilter) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.HelpTicketWhereInput = { orgId };
    if (filter.status) where.status = filter.status;
    if (filter.category) where.category = filter.category;
    if (filter.priority) where.priority = filter.priority;

    const [tickets, total] = await Promise.all([
      this.prisma.helpTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { replies: { where: { isInternal: false } } } },
        },
      }),
      this.prisma.helpTicket.count({ where }),
    ]);

    return { tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Super admin queue across all orgs. */
  async findAll(filter: ListTicketsFilter) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.HelpTicketWhereInput = {};
    if (filter.status) where.status = filter.status;
    if (filter.category) where.category = filter.category;
    if (filter.priority) where.priority = filter.priority;
    if (filter.orgId) where.orgId = filter.orgId;
    if (filter.assignedToId !== undefined) where.assignedToId = filter.assignedToId;

    const [tickets, total] = await Promise.all([
      this.prisma.helpTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          organization: { select: { id: true, name: true, slug: true } },
          assignedTo: ASSIGNEE_SELECT,
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.helpTicket.count({ where }),
    ]);

    return { tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateStatus(id: string, status: TicketStatus) {
    const data: Prisma.HelpTicketUpdateInput = { status };
    if (status === 'CLOSED' || status === 'RESOLVED') {
      data.closedAt = new Date();
    }
    return this.prisma.helpTicket.update({ where: { id }, data });
  }

  /** Assign to a super admin, or unassign with null. */
  async assign(id: string, assignedToId: string | null) {
    return this.prisma.helpTicket.update({
      where: { id },
      data: { assignedToId, assignedAt: assignedToId ? new Date() : null },
      include: { assignedTo: ASSIGNEE_SELECT },
    });
  }

  async addReply(ticketId: string, body: string, userId?: string, superAdminId?: string, isInternal = false) {
    return this.prisma.ticketReply.create({
      data: { ticketId, body, userId: userId ?? null, superAdminId: superAdminId ?? null, isInternal },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        superAdmin: { select: { id: true, name: true } },
      },
    });
  }
}
