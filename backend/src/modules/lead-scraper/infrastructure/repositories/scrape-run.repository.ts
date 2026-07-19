import { Injectable } from '@nestjs/common';
import { ScrapeRun, ScrapeRunStatus, ScrapeSource } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface CreateScrapeRunInput {
  orgId: string;
  source: ScrapeSource;
  keywords: string;
  location?: string;
  maxResults: number;
  createdById: string;
}

export interface UpdateScrapeRunInput {
  status?: ScrapeRunStatus;
  resultCount?: number;
  importedCount?: number;
  skippedCount?: number;
  errorMessage?: string | null;
  completedAt?: Date | null;
}

@Injectable()
export class ScrapeRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateScrapeRunInput): Promise<ScrapeRun> {
    return this.prisma.scrapeRun.create({
      data: {
        orgId: data.orgId,
        source: data.source,
        keywords: data.keywords,
        location: data.location ?? null,
        maxResults: data.maxResults,
        createdById: data.createdById,
        status: ScrapeRunStatus.PENDING,
      },
    });
  }

  async findById(id: string): Promise<ScrapeRun | null> {
    return this.prisma.scrapeRun.findFirst({
      where: { id },
    });
  }

  async update(id: string, data: UpdateScrapeRunInput): Promise<ScrapeRun> {
    return this.prisma.scrapeRun.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.resultCount !== undefined && { resultCount: data.resultCount }),
        ...(data.importedCount !== undefined && { importedCount: data.importedCount }),
        ...(data.skippedCount !== undefined && { skippedCount: data.skippedCount }),
        ...(data.errorMessage !== undefined && { errorMessage: data.errorMessage }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
      },
    });
  }

  async findResults(scrapeRunId: string) {
    return this.prisma.scrapeResult.findMany({
      where: { scrapeRunId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByOrg(
    orgId: string,
    options?: { skip?: number; take?: number; status?: ScrapeRunStatus; source?: ScrapeSource },
  ): Promise<{ runs: ScrapeRun[]; total: number }> {
    const where = {
      orgId,
      ...(options?.status !== undefined && { status: options.status }),
      ...(options?.source !== undefined && { source: options.source }),
    };

    const [runs, total] = await Promise.all([
      this.prisma.scrapeRun.findMany({
        where,
        skip: options?.skip ?? 0,
        take: options?.take ?? 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.scrapeRun.count({ where }),
    ]);

    return { runs, total };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.scrapeRun.delete({ where: { id } });
  }
}
