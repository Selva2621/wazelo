import { Injectable, NotFoundException } from '@nestjs/common';
import { OrgRepository } from '../../infrastructure/repositories/org.repository';
import { Organization } from '@prisma/client';
import { PlatformSettingsService } from '@/modules/platform-settings/domain/services/platform-settings.service';
import { OrgTypeSetup } from '@/modules/platform-settings/domain/services/platform-settings';
import { FreelancerProfileResolverService } from '../services/freelancer-profile-resolver.service';
import { builtInProfile } from '@/shared/constants/freelancer-profiles';

@Injectable()
export class GetOrgSettingsUseCase {
  constructor(
    private readonly orgRepository: OrgRepository,
    private readonly platformSettings: PlatformSettingsService,
    private readonly freelancerProfiles: FreelancerProfileResolverService,
  ) {}

  /**
   * The org, plus which org types are open to setup (for the "How will you use Wazelo?"
   * screen) and, for freelancers on saved cards, their service in words for the
   * outreach/intro text (built-in types have their own copy on the frontend).
   */
  async execute(
    orgId: string,
  ): Promise<Organization & { orgTypeSetup: OrgTypeSetup; freelancerServiceLabel: string | null }> {
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    const [{ orgTypeSetup }, saved] = await Promise.all([
      this.platformSettings.get(),
      this.freelancerProfiles.savedProfiles(org.freelancerTypes),
    ]);
    const words = [
      ...org.freelancerTypes.map((t) => builtInProfile(t)?.serviceLabel ?? saved[t]?.serviceLabel),
      org.freelancerTypes.includes('OTHER') ? org.freelancerService : null,
    ].filter((w): w is string => !!w?.trim());
    return { ...org, orgTypeSetup, freelancerServiceLabel: words.length ? [...new Set(words)].join(', ') : null };
  }
}
