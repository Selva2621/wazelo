import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

type Component = { type: string; format?: string; text?: string; url?: string };

/** Stored like WhatsApp's template parts: an optional image header, then the message */
export function templateComponents(body: string, imageUrl?: string | null): Component[] {
  const parts: Component[] = [];
  if (imageUrl) parts.push({ type: 'HEADER', format: 'IMAGE', url: imageUrl });
  parts.push({ type: 'BODY', text: body });
  return parts;
}

export function templateImageUrl(components: unknown): string | null {
  const header = (components as Component[] | null)?.find((c) => c.type === 'HEADER' && c.format === 'IMAGE');
  return header?.url ?? null;
}

export function templateBody(components: unknown): string {
  return (components as Component[] | null)?.find((c) => c.type === 'BODY')?.text ?? '';
}

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

  /** A template synced from an official number's business account (Meta is the source of truth) */
  async upsertCloud(data: {
    orgId: string;
    cloudSessionId: string;
    name: string;
    language: string;
    category?: string;
    status: string;
    whatsappTemplateId: string;
    components: unknown;
  }) {
    const fields = {
      cloudSessionId: data.cloudSessionId,
      category: data.category ?? null,
      status: data.status,
      whatsappTemplateId: data.whatsappTemplateId,
      components: data.components as any,
      lastSyncedAt: new Date(),
    };
    const existing = await this.findByName(data.orgId, data.name, data.language);
    if (existing) {
      return this.prisma.messageTemplate.update({ where: { id: existing.id }, data: fields });
    }
    return this.prisma.messageTemplate.create({
      data: { orgId: data.orgId, name: data.name, language: data.language, ...fields },
    });
  }

  /** Approved Meta templates an official number can send (all official numbers when no session given) */
  async listCloudApproved(orgId: string, cloudSessionId?: string) {
    return this.prisma.messageTemplate.findMany({
      where: {
        orgId,
        deletedAt: null,
        status: 'APPROVED',
        whatsappTemplateId: { not: null },
        ...(cloudSessionId ? { cloudSessionId } : { cloudSessionId: { not: null } }),
      },
      orderBy: { name: 'asc' },
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
    imageUrl?: string;
  }) {
    return this.prisma.messageTemplate.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        language: data.language ?? 'en',
        category: data.category ?? null,
        status: 'PENDING',
        components: templateComponents(data.body, data.imageUrl) as any,
        exampleValues: data.productId ? { productId: data.productId } : undefined,
      },
    });
  }

  async update(
    id: string,
    orgId: string,
    data: {
      name?: string;
      body?: string;
      category?: string;
      language?: string;
      productId?: string | null;
      /** The current parts, so a body-only or image-only change keeps the other */
      current?: unknown;
      /** null or '' removes the image */
      imageUrl?: string | null;
    },
  ) {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.category !== undefined) patch.category = data.category;
    if (data.language !== undefined) patch.language = data.language;
    if (data.body !== undefined || data.imageUrl !== undefined) {
      const body = data.body ?? templateBody(data.current);
      const imageUrl = data.imageUrl !== undefined ? data.imageUrl : templateImageUrl(data.current);
      patch.components = templateComponents(body, imageUrl);
    }
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
