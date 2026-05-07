import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class TemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: {
    orgId: string;
    channelId?: string;
    name: string;
    language: string;
    category?: string;
    status: string;
    whatsappTemplateId?: string;
    components: unknown;
  }) {
    return this.prisma.messageTemplate.upsert({
      where: {
        unique_template_per_org: {
          orgId: data.orgId,
          name: data.name,
          language: data.language,
          deletedAt: null as any,
        },
      },
      create: {
        orgId: data.orgId,
        channelId: data.channelId,
        name: data.name,
        language: data.language,
        category: data.category,
        status: data.status,
        whatsappTemplateId: data.whatsappTemplateId,
        components: data.components as any,
        lastSyncedAt: new Date(),
      },
      update: {
        status: data.status,
        category: data.category,
        components: data.components as any,
        whatsappTemplateId: data.whatsappTemplateId,
        lastSyncedAt: new Date(),
      },
    });
  }

  async list(orgId: string, status?: string) {
    return this.prisma.messageTemplate.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(status && { status }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, orgId: string) {
    return this.prisma.messageTemplate.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async findByName(orgId: string, name: string, language: string) {
    return this.prisma.messageTemplate.findFirst({
      where: { orgId, name, language, deletedAt: null },
    });
  }

  async create(data: {
    orgId: string;
    name: string;
    body: string;
    language?: string;
    category?: string;
    productId?: string;
  }) {
    return this.prisma.messageTemplate.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        language: data.language ?? 'en',
        category: data.category ?? null,
        status: 'PENDING',
        components: [{ type: 'BODY', text: data.body }] as any,
        exampleValues: data.productId ? { productId: data.productId } : undefined,
      },
    });
  }

  async update(
    id: string,
    orgId: string,
    data: { name?: string; body?: string; category?: string; language?: string; productId?: string | null },
  ) {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.category !== undefined) patch.category = data.category;
    if (data.language !== undefined) patch.language = data.language;
    if (data.body !== undefined) patch.components = [{ type: 'BODY', text: data.body }];
    if (data.productId !== undefined) patch.exampleValues = data.productId ? { productId: data.productId } : null;

    return this.prisma.messageTemplate.updateMany({
      where: { id, orgId, deletedAt: null },
      data: patch,
    });
  }

  async softDelete(id: string, orgId: string) {
    return this.prisma.messageTemplate.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
