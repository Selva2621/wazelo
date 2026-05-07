import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class SequenceTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    orgId: string;
    name: string;
    category?: string;
    messageType?: MessageType;
    messageBody?: string;
    mediaUrl?: string;
    mediaMimeType?: string;
  }) {
    return this.prisma.sequenceTemplate.create({ data: data as any });
  }

  async findByOrg(orgId: string, category?: string) {
    return this.prisma.sequenceTemplate.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdAndOrg(id: string, orgId: string) {
    return this.prisma.sequenceTemplate.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async update(id: string, data: {
    name?: string;
    category?: string;
    messageType?: MessageType;
    messageBody?: string;
    mediaUrl?: string;
    mediaMimeType?: string;
  }) {
    return this.prisma.sequenceTemplate.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prisma.sequenceTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
