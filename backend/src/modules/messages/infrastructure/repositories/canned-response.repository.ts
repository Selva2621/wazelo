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

  async incrementUsage(id: string) {
    return this.prisma.cannedResponse.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
