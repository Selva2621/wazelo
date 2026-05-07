import { Injectable } from '@nestjs/common';
import { OrgRepository } from '../../infrastructure/repositories/org.repository';
import { Organization } from '@prisma/client';
import { MAX_SLUG_LENGTH } from '@/common/constants';

@Injectable()
export class OrgService {
  constructor(private readonly orgRepository: OrgRepository) {}

  async createOrganization(name: string): Promise<Organization> {
    const slug = await this.generateUniqueSlug(name);
    return this.orgRepository.create({ name, slug });
  }

  async findById(id: string): Promise<Organization | null> {
    return this.orgRepository.findById(id);
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    let baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, MAX_SLUG_LENGTH);

    if (!baseSlug) {
      baseSlug = 'org';
    }

    let slug = baseSlug;
    let attempt = 0;

    while (await this.orgRepository.slugExists(slug)) {
      attempt++;
      const suffix = `-${attempt}`;
      slug = baseSlug.slice(0, MAX_SLUG_LENGTH - suffix.length) + suffix;
    }

    return slug;
  }
}
