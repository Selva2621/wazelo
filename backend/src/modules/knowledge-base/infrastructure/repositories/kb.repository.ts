import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class KbRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ─── Categories ─── */

  async createCategory(data: { orgId: string; name: string; slug: string; description?: string; sortOrder?: number }) {
    return this.prisma.kbCategory.create({ data });
  }

  async findCategoriesByOrg(orgId: string) {
    return this.prisma.kbCategory.findMany({
      where: { orgId },
      include: { _count: { select: { articles: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateCategory(id: string, orgId: string, data: Partial<{ name: string; slug: string; description: string | null; sortOrder: number }>) {
    return this.prisma.kbCategory.updateMany({ where: { id, orgId }, data });
  }

  async deleteCategory(id: string, orgId: string) {
    // Unlink articles first
    await this.prisma.kbArticle.updateMany({ where: { categoryId: id, orgId }, data: { categoryId: null } });
    return this.prisma.kbCategory.deleteMany({ where: { id, orgId } });
  }

  /* ─── Articles ─── */

  async createArticle(data: {
    orgId: string;
    categoryId?: string;
    title: string;
    slug: string;
    body: string;
    isPublished?: boolean;
    isInternal?: boolean;
    authorId: string;
    tags?: string[];
  }) {
    return this.prisma.kbArticle.create({
      data,
      include: { category: { select: { id: true, name: true } }, author: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findByIdAndOrg(id: string, orgId: string) {
    return this.prisma.kbArticle.findFirst({
      where: { id, orgId, deletedAt: null },
      include: { category: { select: { id: true, name: true } }, author: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findByOrgPaginated(orgId: string, params: {
    categoryId?: string;
    isPublished?: boolean;
    isInternal?: boolean;
    search?: string;
    take?: number;
    skip?: number;
  }) {
    const where: any = { orgId, deletedAt: null };
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.isPublished !== undefined) where.isPublished = params.isPublished;
    if (params.isInternal !== undefined) where.isInternal = params.isInternal;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { body: { contains: params.search, mode: 'insensitive' } },
        { tags: { has: params.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.kbArticle.findMany({
        where,
        include: { category: { select: { id: true, name: true } }, author: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { updatedAt: 'desc' },
        take: params.take ?? 20,
        skip: params.skip ?? 0,
      }),
      this.prisma.kbArticle.count({ where }),
    ]);
    return { data, total };
  }

  async updateArticle(id: string, orgId: string, data: Partial<{
    title: string;
    slug: string;
    body: string;
    categoryId: string | null;
    isPublished: boolean;
    isInternal: boolean;
    tags: string[];
  }>) {
    return this.prisma.kbArticle.updateMany({ where: { id, orgId, deletedAt: null }, data: data as any });
  }

  async softDelete(id: string, orgId: string) {
    return this.prisma.kbArticle.updateMany({ where: { id, orgId }, data: { deletedAt: new Date() } });
  }

  async incrementViewCount(id: string) {
    return this.prisma.kbArticle.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  }

  async incrementHelpfulCount(id: string) {
    return this.prisma.kbArticle.update({ where: { id }, data: { helpfulCount: { increment: 1 } } });
  }

  /* ─── Public Search (for widget/bot integration) ─── */

  async searchPublicArticles(orgId: string, query: string, take = 5, productIds?: string[]) {
    return this.prisma.kbArticle.findMany({
      where: {
        orgId,
        isPublished: true,
        isInternal: false,
        deletedAt: null,
        ...(productIds?.length && {
          articleProducts: { some: { productId: { in: productIds } } },
        }),
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { body: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
      },
      select: { id: true, title: true, slug: true, body: true, categoryId: true, tags: true },
      take,
      orderBy: { viewCount: 'desc' },
    });
  }

  /* ─── Documents ─── */

  async createDocument(data: {
    orgId: string;
    flowId?: string;
    title: string;
    filename: string;
    fileUrl: string;
    contentType: string;
    fileSize: number;
    uploadedById: string;
  }) {
    return this.prisma.kbDocument.create({ data });
  }

  async updateDocumentStatus(id: string, status: string, extractedText?: string) {
    return this.prisma.kbDocument.update({
      where: { id },
      data: { status, ...(extractedText !== undefined && { extractedText }) },
    });
  }

  async findDocumentsByOrg(orgId: string, flowId?: string) {
    const where: any = { orgId, deletedAt: null };
    if (flowId) where.flowId = flowId;
    return this.prisma.kbDocument.findMany({
      where,
      select: {
        id: true, title: true, filename: true, contentType: true, fileSize: true,
        status: true, flowId: true, createdAt: true,
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findReadyDocuments(orgId: string, flowId?: string) {
    const where: any = { orgId, status: 'READY', deletedAt: null };
    if (flowId) where.flowId = flowId;
    return this.prisma.kbDocument.findMany({
      where,
      select: { id: true, title: true, extractedText: true },
    });
  }

  async findDocumentById(id: string, orgId: string) {
    return this.prisma.kbDocument.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async softDeleteDocument(id: string, orgId: string) {
    return this.prisma.kbDocument.updateMany({
      where: { id, orgId },
      data: { deletedAt: new Date() },
    });
  }

  async resolveOrgIdBySlug(slug: string): Promise<string | null> {
    const org = await this.prisma.organization.findFirst({
      where: { slug },
      select: { id: true },
    });
    return org?.id ?? null;
  }
}
