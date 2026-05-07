import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_REGEX, PASSWORD_REQUIREMENTS } from '@/common/constants';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS })
  newPassword: string;
}
