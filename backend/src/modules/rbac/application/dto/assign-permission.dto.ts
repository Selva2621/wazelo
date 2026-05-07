import { IsEnum, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * Assign a single permission to a role.
 * Idempotent — assigning an already-assigned permission is a no-op.
 */
export class AssignPermissionDto {
  @IsEnum(UserRole, {
    message: 'Role must be one of: ADMIN, MANAGER, EMPLOYEE',
  })
  role: UserRole;

  @IsUUID('4')
  permissionId: string;
}
