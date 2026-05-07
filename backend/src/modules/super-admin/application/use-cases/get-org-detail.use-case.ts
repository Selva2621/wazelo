import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class GetOrgDetailUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId, deletedAt: null },
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            id: true, firstName: true, lastName: true,
            email: true, role: true, status: true,
            lastLoginAt: true, createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { plan: true },
        },
        usageRecords: {
          orderBy: { periodStart: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            helpTickets: true,
            contacts: { where: { deletedAt: null } },
            campaigns: { where: { deletedAt: null } },
            messages: true,
          },
        },
      },
    });

    if (!org) throw new NotFoundException('Organization not found');

    return {
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        orgType: org.orgType,
        timezone: org.timezone,
        createdAt: org.createdAt,
      },
      users: org.users,
      subscription: org.subscriptions[0] ?? null,
      subscriptionHistory: org.subscriptions,
      usageRecords: org.usageRecords,
      counts: org._count,
    };
  }
}
