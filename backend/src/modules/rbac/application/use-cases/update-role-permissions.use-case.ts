import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RbacRepository } from '../../infrastructure/repositories/rbac.repository';
import { RbacService } from '../../domain/services/rbac.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
import { AuditAction, UserRole } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';

@Injectable()
export class UpdateRolePermissionsUseCase {
  private readonly logger = new Logger(UpdateRolePermissionsUseCase.name);

  constructor(
    private readonly rbacRepository: RbacRepository,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Bulk replace all permissions for a role in the caller's org.
   *
   * Constraints:
   *   - ADMIN role permissions cannot be modified (they always have full access)
   *   - All permissionIds must exist in the permissions table
   *   - Cache is invalidated after update
   */
  async execute(
    orgId: string,
    userId: string,
    dto: UpdateRolePermissionsDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // ADMIN role always has full access — cannot be restricted
    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException(
        'Admin role permissions cannot be modified. Admins always have full access.',
      );
    }

    // Validate all permissionIds exist
    const allPermissions = await this.rbacRepository.findAllPermissions();
    const validIds = new Set(allPermissions.map((p) => p.id));
    const invalidIds = dto.permissionIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid permission IDs: ${invalidIds.join(', ')}`,
      );
    }

    // Perform atomic replacement
    const updated = await this.rbacRepository.replacePermissionsForRole(
      orgId,
      dto.role,
      dto.permissionIds,
      userId,
    );

    // Invalidate cache for this org+role so changes take effect immediately
    this.rbacService.invalidateCache(orgId, dto.role);

    // Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.ROLE_PERMISSION_UPDATED,
      targetType: 'role',
      targetId: dto.role,
      metadata: {
        permissionCount: dto.permissionIds.length,
        permissionIds: dto.permissionIds,
      },
      ipAddress,
      userAgent,
    });

    // Emit event for real-time notification
    this.eventEmitter.emit(EVENT_NAMES.ROLE_PERMISSION_UPDATED, {
      orgId,
      role: dto.role,
      updatedById: userId,
    });

    this.logger.log(
      `Updated ${dto.role} permissions for org ${orgId}: ${dto.permissionIds.length} permissions`,
    );

    return {
      role: dto.role,
      permissions: updated.map((rp) => ({
        id: rp.permission.id,
        resource: rp.permission.resource,
        action: rp.permission.action,
        key: `${rp.permission.resource}:${rp.permission.action}`,
      })),
      total: updated.length,
    };
  }
}
