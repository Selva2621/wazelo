import { IsEmail, IsString, IsNotEmpty, Matches, IsJWT } from 'class-validator';

export class SuperAdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SuperAdminTwoFactorCodeDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your authenticator app' })
  code: string;
}

export class SuperAdminTwoFactorLoginDto extends SuperAdminTwoFactorCodeDto {
  @IsJWT()
  challengeToken: string;
}
