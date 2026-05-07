import { Injectable, NotFoundException } from '@nestjs/common';
import { OrgRepository } from '../../infrastructure/repositories/org.repository';
import { Organization } from '@prisma/client';

@Injectable()
export class GetOrgSettingsUseCase {
  constructor(private readonly orgRepository: OrgRepository) {}

  async execute(orgId: string): Promise<Organization> {
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }
}
