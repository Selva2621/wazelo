import {
  IsEnum,
  IsArray,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * Bulk replace all permissions for a role in the caller's org.
 * This is an atomic operation — all existing permissions for the role are replaced.
 */
export class UpdateRolePermissionsDto {
  @IsEnum(UserRole, {
    message: 'Role must be one of: ADMIN, MANAGER, EMPLOYEE',
  })
  role: UserRole;

  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(0)
  permissionIds: string[];
}
