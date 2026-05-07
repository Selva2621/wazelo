import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { PASSWORD_REGEX, PASSWORD_REQUIREMENTS } from '@/common/constants';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS })
  password: string;

  @IsEnum(UserRole, {
    message: 'Role must be one of: ADMIN, MANAGER, EMPLOYEE',
  })
  @IsNotEmpty()
  role: UserRole;
}
