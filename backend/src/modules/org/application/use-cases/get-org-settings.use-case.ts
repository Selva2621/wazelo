import { Injectable, NotFoundException } from '@nestjs/common';
import { OrgRepository } from '../../infrastructure/repositories/org.repository';
import { Organization } from '@prisma/client';
import { PlatformSettingsService } from '@/modules/platform-settings/domain/services/platform-settings.service';
import { OrgTypeSetup } from '@/modules/platform-settings/domain/services/platform-settings';

@Injectable()
export class GetOrgSettingsUseCase {
  constructor(
    private readonly orgRepository: OrgRepository,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  /** The org, plus which org types are open to setup (for the "How will you use Wazelo?" screen). */
  async execute(orgId: string): Promise<Organization & { orgTypeSetup: OrgTypeSetup }> {
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    const { orgTypeSetup } = await this.platformSettings.get();
    return { ...org, orgTypeSetup };
  }
}
