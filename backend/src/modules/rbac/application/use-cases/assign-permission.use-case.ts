import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RbacRepository } from '../../infrastructure/repositories/rbac.repository';
import { RbacService } from '../../domain/services/rbac.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AssignPermissionDto } from '../dto/assign-permission.dto';
import { AuditAction, UserRole } from '@prisma/client';

@Injectable()
export class AssignPermissionUseCase {
  constructor(
    private readonly rbacRepository: RbacRepository,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: AssignPermissionDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException(
        'Admin role permissions cannot be modified.',
      );
    }

    // Verify permission exists
    const allPermissions = await this.rbacRepository.findAllPermissions();
    const permission = allPermissions.find((p) => p.id === dto.permissionId);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.rbacRepository.assignPermissionToRole(
      orgId,
      dto.role,
      dto.permissionId,
      userId,
    );

    // Invalidate cache immediately
    this.rbacService.invalidateCache(orgId, dto.role);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.ROLE_PERMISSION_UPDATED,
      targetType: 'permission',
      targetId: dto.permissionId,
      metadata: {
        operation: 'assign',
        role: dto.role,
        permission: `${permission.resource}:${permission.action}`,
      },
      ipAddress,
      userAgent,
    });

    return {
      message: `Permission ${permission.resource}:${permission.action} assigned to ${dto.role}`,
    };
  }
}
