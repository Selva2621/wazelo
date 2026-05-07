import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Organization, Prisma } from '@prisma/client';

export interface UpdateOrgSettingsInput {
  name?: string;
  slug?: string;
  timezone?: string;
  branding?: Prisma.InputJsonValue;
  industry?: string;
  description?: string;
  website?: string;
}

@Injectable()
export class OrgRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return this.prisma.organization.create({ data });
  }

  async findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.prisma.organization.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await this.prisma.organization.count({
      where: { slug, deletedAt: null },
    });
    return count > 0;
  }

  async update(
    id: string,
    data: UpdateOrgSettingsInput,
  ): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.branding !== undefined && { branding: data.branding }),
        ...(data.industry !== undefined && { industry: data.industry }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.website !== undefined && { website: data.website }),
      },
    });
  }

  async slugExistsExcluding(
    slug: string,
    excludeOrgId: string,
  ): Promise<boolean> {
    const count = await this.prisma.organization.count({
      where: { slug, deletedAt: null, id: { not: excludeOrgId } },
    });
    return count > 0;
  }
}
