import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class PipelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    orgId: string;
    name: string;
    description?: string;
    stages: { name: string; order: number; color?: string; isWonStage?: boolean; isLostStage?: boolean }[];
  }) {
    return this.prisma.pipeline.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        description: data.description || null,
        stages: {
          create: data.stages.map((s) => ({
            name: s.name,
            order: s.order,
            color: s.color || null,
            isWonStage: s.isWonStage || false,
            isLostStage: s.isLostStage || false,
          })),
        },
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  async findByOrg(orgId: string) {
    return this.prisma.pipeline.findMany({
      where: { orgId, deletedAt: null },
      include: { stages: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByIdAndOrg(id: string, orgId: string) {
    return this.prisma.pipeline.findFirst({
      where: { id, orgId, deletedAt: null },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    return this.prisma.pipeline.update({
      where: { id },
      data,
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  async addStage(pipelineId: string, data: {
    name: string;
    order: number;
    color?: string;
    isWonStage?: boolean;
    isLostStage?: boolean;
  }) {
    return this.prisma.pipelineStage.create({
      data: {
        pipelineId,
        name: data.name,
        order: data.order,
        color: data.color || null,
        isWonStage: data.isWonStage || false,
        isLostStage: data.isLostStage || false,
      },
    });
  }

  async updateStage(stageId: string, data: { name?: string; order?: number; color?: string }) {
    return this.prisma.pipelineStage.update({
      where: { id: stageId },
      data,
    });
  }

  async deleteStage(stageId: string) {
    return this.prisma.pipelineStage.delete({ where: { id: stageId } });
  }

  async findDefaultOrFirst(orgId: string) {
    const defaultPipeline = await this.prisma.pipeline.findFirst({
      where: { orgId, isDefault: true, deletedAt: null },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    if (defaultPipeline) return defaultPipeline;
    return this.prisma.pipeline.findFirst({
      where: { orgId, deletedAt: null },
      include: { stages: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async softDelete(id: string) {
    return this.prisma.pipeline.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
