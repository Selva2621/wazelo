import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class CannedResponseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    orgId: string;
    title: string;
    content: string;
    shortcut?: string;
    category?: string;
    createdById: string;
  }) {
    return this.prisma.cannedResponse.create({ data });
  }

  async findById(id: string, orgId: string) {
    return this.prisma.cannedResponse.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async list(orgId: string, category?: string) {
    return this.prisma.cannedResponse.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(category && { category }),
      },
      orderBy: [{ usageCount: 'desc' }, { title: 'asc' }],
    });
  }

  async update(
    id: string,
    orgId: string,
    data: { title?: string; content?: string; shortcut?: string; category?: string },
  ) {
    return this.prisma.cannedResponse.updateMany({
      where: { id, orgId, deletedAt: null },
      data,
    });
  }

  async softDelete(id: string, orgId: string) {
    return this.prisma.cannedResponse.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /** A live reply in the org already using this shortcut (any letter case) */
  async findByShortcut(orgId: string, shortcut: string) {
    return this.prisma.cannedResponse.findFirst({
      where: { orgId, deletedAt: null, shortcut: { equals: shortcut, mode: 'insensitive' } },
      select: { id: true },
    });
  }

  /** Scoped to the org: another org's reply id is ignored */
  async incrementUsage(id: string, orgId: string) {
    return this.prisma.cannedResponse.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { usageCount: { increment: 1 } },
    });
  }
}
