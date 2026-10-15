import { IsEmail, IsString, IsNotEmpty, Matches, IsJWT, MaxLength, MinLength } from 'class-validator';

export class SuperAdminLoginDto {
  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  password: string;
}

export class SuperAdminTwoFactorCodeDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your authenticator app' })
  code: string;
}

/** Login step 2 accepts an authenticator code or a one-time recovery code (XXXXX-XXXXX). */
export class SuperAdminTwoFactorLoginDto {
  @IsJWT()
  challengeToken: string;

  @IsString()
  @Matches(/^(\d{6}|[A-Za-z0-9]{5}-?[A-Za-z0-9]{5})$/, {
    message: 'Enter the 6-digit code from your authenticator app, or a recovery code',
  })
  code: string;
}

export class SuperAdminChallengeDto {
  @IsJWT()
  challengeToken: string;
}

export class SuperAdminTwoFactorEnrollDto extends SuperAdminTwoFactorCodeDto {
  @IsJWT()
  challengeToken: string;
}

/** New passwords: 12–128 characters (length beats composition rules). */
export class SuperAdminPasswordChangeLoginDto {
  @IsJWT()
  challengeToken: string;

  @IsString()
  @MinLength(12, { message: 'Use at least 12 characters' })
  @MaxLength(128)
  newPassword: string;
}

export class ChangeSuperAdminPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  currentPassword: string;

  @IsString()
  @MinLength(12, { message: 'Use at least 12 characters' })
  @MaxLength(128)
  newPassword: string;
}

export class CreateSuperAdminAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEmail()
  @MaxLength(320)
  email: string;
}
