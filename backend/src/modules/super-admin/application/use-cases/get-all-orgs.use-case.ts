import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface GetAllOrgsInput {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

@Injectable()
export class GetAllOrgsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: GetAllOrgsInput) {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (input.search) {
      where.OR = [
        { name: { contains: input.search, mode: 'insensitive' } },
        { slug: { contains: input.search, mode: 'insensitive' } },
      ];
    }

    const [orgs, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: { where: { deletedAt: null } } } },
          subscriptions: {
            where: {
              status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'GRACE_PERIOD'] as any },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { plan: true },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    // Filter by subscription status if requested
    let filtered = orgs;
    if (input.status) {
      filtered = orgs.filter(
        (o) => o.subscriptions[0]?.status === input.status || (!o.subscriptions[0] && input.status === 'NONE'),
      );
    }

    return {
      orgs: filtered.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        orgType: o.orgType,
        createdAt: o.createdAt,
        userCount: o._count.users,
        subscription: o.subscriptions[0]
          ? {
              status: o.subscriptions[0].status,
              planName: o.subscriptions[0].plan?.name ?? null,
              billingCycle: o.subscriptions[0].billingCycle,
              currentPeriodEnd: o.subscriptions[0].currentPeriodEnd,
              priceInCents: o.subscriptions[0].priceInCents,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
