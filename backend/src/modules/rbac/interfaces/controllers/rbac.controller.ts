import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../domain/permissions.constants';
import {
  UpdateRolePermissionsDto,
  AssignPermissionDto,
  RevokePermissionDto,
} from '../../application/dto';
import {
  GetPermissionsUseCase,
  GetRolePermissionsUseCase,
  UpdateRolePermissionsUseCase,
  AssignPermissionUseCase,
  RevokePermissionUseCase,
} from '../../application/use-cases';

@Controller('rbac')
export class RbacController {
  constructor(
    private readonly getPermissionsUseCase: GetPermissionsUseCase,
    private readonly getRolePermissionsUseCase: GetRolePermissionsUseCase,
    private readonly updateRolePermissionsUseCase: UpdateRolePermissionsUseCase,
    private readonly assignPermissionUseCase: AssignPermissionUseCase,
    private readonly revokePermissionUseCase: RevokePermissionUseCase,
  ) {}

  /**
   * GET /rbac/permissions
   * List all available permission definitions.
   * Used by admin UI to populate permission assignment dropdowns.
   */
  @Get('permissions')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.RBAC_READ)
  async listPermissions() {
    return this.getPermissionsUseCase.execute();
  }

  /**
   * GET /rbac/role-permissions
   * Get the current role → permission mapping for the caller's org.
   */
  @Get('role-permissions')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.RBAC_READ)
  async getRolePermissions(@CurrentUser() user: JwtPayload) {
    return this.getRolePermissionsUseCase.execute(user.orgId);
  }

  /**
   * PUT /rbac/role-permissions
   * Bulk replace all permissions for a role.
   * Atomic operation — replaces the entire permission set.
   */
  @Put('role-permissions')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.RBAC_UPDATE)
  async updateRolePermissions(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateRolePermissionsDto,
    @Req() req: Request,
  ) {
    return this.updateRolePermissionsUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  /**
   * POST /rbac/assign
   * Assign a single permission to a role.
   * Idempotent — assigning an already-assigned permission is a no-op.
   */
  @Post('assign')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.RBAC_UPDATE)
  async assignPermission(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignPermissionDto,
    @Req() req: Request,
  ) {
    return this.assignPermissionUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  /**
   * POST /rbac/revoke
   * Revoke a single permission from a role.
   * Idempotent — revoking a non-assigned permission is a no-op.
   */
  @Post('revoke')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.RBAC_UPDATE)
  async revokePermission(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RevokePermissionDto,
    @Req() req: Request,
  ) {
    return this.revokePermissionUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
