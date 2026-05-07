import { Injectable, BadRequestException } from '@nestjs/common';
import { RbacRepository } from '../../infrastructure/repositories/rbac.repository';
import { RbacService } from '../../domain/services/rbac.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { RevokePermissionDto } from '../dto/revoke-permission.dto';
import { AuditAction, UserRole } from '@prisma/client';

@Injectable()
export class RevokePermissionUseCase {
  constructor(
    private readonly rbacRepository: RbacRepository,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: RevokePermissionDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException(
        'Admin role permissions cannot be modified.',
      );
    }

    await this.rbacRepository.revokePermissionFromRole(
      orgId,
      dto.role,
      dto.permissionId,
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
        operation: 'revoke',
        role: dto.role,
      },
      ipAddress,
      userAgent,
    });

    return {
      message: `Permission revoked from ${dto.role}`,
    };
  }
}
