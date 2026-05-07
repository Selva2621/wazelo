import { Injectable } from '@nestjs/common';
import { RbacService } from '../../domain/services/rbac.service';

@Injectable()
export class GetPermissionsUseCase {
  constructor(private readonly rbacService: RbacService) {}

  /**
   * Get all permission definitions (for admin UI dropdowns/listing).
   */
  async execute() {
    const permissions = await this.rbacService.getAllPermissions();

    return {
      permissions: permissions.map((p) => ({
        id: p.id,
        resource: p.resource,
        action: p.action,
        key: `${p.resource}:${p.action}`,
        description: p.description,
      })),
      total: permissions.length,
    };
  }
}
