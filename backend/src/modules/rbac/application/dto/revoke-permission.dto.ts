import { IsEnum, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * Revoke a single permission from a role.
 * Idempotent — revoking a non-assigned permission is a no-op.
 */
export class RevokePermissionDto {
  @IsEnum(UserRole, {
    message: 'Role must be one of: ADMIN, MANAGER, EMPLOYEE',
  })
  role: UserRole;

  @IsUUID('4')
  permissionId: string;
}
