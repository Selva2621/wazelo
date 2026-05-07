import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '@prisma/client';

export class ChangeRoleDto {
  @IsEnum(UserRole, {
    message: 'Role must be one of: ADMIN, MANAGER, EMPLOYEE',
  })
  @IsNotEmpty()
  role: UserRole;
}
