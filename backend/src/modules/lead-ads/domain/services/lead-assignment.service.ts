import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class LeadAssignmentService {
  private readonly logger = new Logger(LeadAssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assign a lead to a team member using round-robin.
   * Returns the user ID of the assigned owner.
   */
  async assignOwner(orgId: string): Promise<string> {
    // Get active users in the org (employees + managers)
    const users = await this.prisma.user.findMany({
      where: {
        orgId,
        status: 'ACTIVE',
        deletedAt: null,
        role: { in: ['EMPLOYEE', 'MANAGER'] },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (users.length === 0) {
      // Fallback: assign to org admin
      const admin = await this.prisma.user.findFirst({
        where: {
          orgId,
          role: 'ADMIN',
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!admin) {
        throw new Error(`No active users found in org ${orgId} for lead assignment`);
      }

      return admin.id;
    }

    // Round-robin: count contacts per user, assign to the one with fewest
    const contactCounts = await this.prisma.contact.groupBy({
      by: ['ownerId'],
      where: {
        orgId,
        ownerId: { in: users.map((u) => u.id) },
        deletedAt: null,
        source: { in: ['FACEBOOK_LEAD_AD', 'INSTAGRAM_LEAD_AD', 'WHATSAPP_LEAD_AD'] },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      },
      _count: { id: true },
    });

    const countMap = new Map<string, number>();
    for (const c of contactCounts) {
      countMap.set(c.ownerId, c._count.id);
    }

    // Find user with fewest recent lead assignments
    let minCount = Infinity;
    let assigneeId = users[0].id;
    for (const user of users) {
      const count = countMap.get(user.id) ?? 0;
      if (count < minCount) {
        minCount = count;
        assigneeId = user.id;
      }
    }

    this.logger.debug(
      `Assigned lead to user ${assigneeId} (${minCount} recent leads)`,
    );

    return assigneeId;
  }
}
