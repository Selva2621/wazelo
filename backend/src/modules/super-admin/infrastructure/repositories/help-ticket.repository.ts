import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { TicketStatus, TicketCategory, TicketPriority } from '@prisma/client';

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
}

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

  async findById(id: string) {
    return this.prisma.helpTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        organization: { select: { id: true, name: true, slug: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            superAdmin: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async findByOrg(orgId: string, filter: ListTicketsFilter) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { orgId };
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
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.helpTicket.count({ where }),
    ]);

    return { tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAll(filter: ListTicketsFilter) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filter.status) where.status = filter.status;
    if (filter.category) where.category = filter.category;
    if (filter.priority) where.priority = filter.priority;
    if (filter.orgId) where.orgId = filter.orgId;

    const [tickets, total] = await Promise.all([
      this.prisma.helpTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          organization: { select: { id: true, name: true, slug: true } },
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.helpTicket.count({ where }),
    ]);

    return { tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateStatus(id: string, status: TicketStatus) {
    const data: any = { status };
    if (status === 'CLOSED' || status === 'RESOLVED') {
      data.closedAt = new Date();
    }
    return this.prisma.helpTicket.update({ where: { id }, data });
  }

  async addReply(ticketId: string, body: string, userId?: string, superAdminId?: string) {
    return this.prisma.ticketReply.create({
      data: { ticketId, body, userId: userId ?? null, superAdminId: superAdminId ?? null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        superAdmin: { select: { id: true, name: true } },
      },
    });
  }
}
