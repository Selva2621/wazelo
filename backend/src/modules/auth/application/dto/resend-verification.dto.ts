import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(320)
  email: string;
}
