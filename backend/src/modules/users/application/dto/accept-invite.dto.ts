import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { PASSWORD_REGEX, PASSWORD_REQUIREMENTS } from '@/common/constants';

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  token: string;

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
}
