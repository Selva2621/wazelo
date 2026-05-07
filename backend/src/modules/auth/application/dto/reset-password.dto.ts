import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_REGEX, PASSWORD_REQUIREMENTS } from '@/common/constants';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS })
  newPassword: string;
}
