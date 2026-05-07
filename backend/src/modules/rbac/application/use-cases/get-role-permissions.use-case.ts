import { Injectable } from '@nestjs/common';
import { RbacService } from '../../domain/services/rbac.service';

@Injectable()
export class GetRolePermissionsUseCase {
  constructor(private readonly rbacService: RbacService) {}

  /**
   * Get all role → permission mappings for the caller's org.
   */
  async execute(orgId: string) {
    const rolePermissions =
      await this.rbacService.getRolePermissionsForOrg(orgId);

    return { rolePermissions };
  }
}
