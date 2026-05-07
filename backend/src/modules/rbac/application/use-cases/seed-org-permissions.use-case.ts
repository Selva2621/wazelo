import { Injectable, Logger } from '@nestjs/common';
import { RbacService } from '../../domain/services/rbac.service';

/**
 * Seeds default role-permission mappings for a newly created org.
 * Called from the registration flow after org is created.
 */
@Injectable()
export class SeedOrgPermissionsUseCase {
  private readonly logger = new Logger(SeedOrgPermissionsUseCase.name);

  constructor(private readonly rbacService: RbacService) {}

  async execute(orgId: string): Promise<void> {
    try {
      await this.rbacService.seedDefaultPermissionsForOrg(orgId);
    } catch (error) {
      this.logger.error(
        `Failed to seed permissions for org ${orgId}: ${error.message}`,
      );
      // Non-fatal — org can still function with admin bypass
      // Permissions can be seeded later via the admin API
    }
  }
}
