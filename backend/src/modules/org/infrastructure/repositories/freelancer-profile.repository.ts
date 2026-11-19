import { Injectable } from '@nestjs/common';
import { FreelancerServiceProfile, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface FreelancerProfileInput {
  label: string;
  description: string;
  serviceLabel: string;
  pitch: Record<string, string>;
  keywords: string[];
}

/**
 * Lines of work a super admin added to the setup catalog (the built-in ones live in
 * shared/constants/freelancer-profiles.ts). Platform data, so no org_id.
 * `aliases` holds the search keywords. Pure reads/writes.
 */
@Injectable()
export class FreelancerProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByKey(key: string): Promise<FreelancerServiceProfile | null> {
    return this.prisma.freelancerServiceProfile.findFirst({ where: { key, deletedAt: null } });
  }

  findById(id: string): Promise<FreelancerServiceProfile | null> {
    return this.prisma.freelancerServiceProfile.findFirst({ where: { id, deletedAt: null } });
  }

  /** Includes hidden ones: an org that picked an entry before it was hidden keeps its wording */
  findByKeys(keys: string[]): Promise<FreelancerServiceProfile[]> {
    if (!keys.length) return Promise.resolve([]);
    return this.prisma.freelancerServiceProfile.findMany({ where: { key: { in: keys }, deletedAt: null } });
  }

  /** Shown in setup, oldest first */
  listActive(): Promise<FreelancerServiceProfile[]> {
    return this.prisma.freelancerServiceProfile.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  /** Super admin list, hidden ones included */
  listAll(): Promise<FreelancerServiceProfile[]> {
    return this.prisma.freelancerServiceProfile.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } });
  }

  /** Null when the key is taken (also by a deleted entry, which keeps its key reserved) */
  async create(key: string, input: FreelancerProfileInput): Promise<FreelancerServiceProfile | null> {
    try {
      return await this.prisma.freelancerServiceProfile.create({
        data: {
          key,
          label: input.label,
          description: input.description,
          serviceLabel: input.serviceLabel,
          pitch: input.pitch as Prisma.InputJsonValue,
          aliases: input.keywords,
          usageCount: 0,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return null;
      throw err;
    }
  }

  update(id: string, input: Partial<FreelancerProfileInput> & { isActive?: boolean }): Promise<FreelancerServiceProfile> {
    return this.prisma.freelancerServiceProfile.update({
      where: { id },
      data: {
        ...(input.label !== undefined && { label: input.label }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.serviceLabel !== undefined && { serviceLabel: input.serviceLabel }),
        ...(input.pitch !== undefined && { pitch: input.pitch as Prisma.InputJsonValue }),
        ...(input.keywords !== undefined && { aliases: input.keywords }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.freelancerServiceProfile.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  /** One more org picked it (super admin sees how much each entry is used) */
  async recordUse(keys: string[]): Promise<void> {
    if (!keys.length) return;
    await this.prisma.freelancerServiceProfile.updateMany({
      where: { key: { in: keys }, deletedAt: null },
      data: { usageCount: { increment: 1 } },
    });
  }
}
