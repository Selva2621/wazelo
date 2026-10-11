import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/** Every field optional. Formats are checked in the use case (planPlatformSettingsChange). */
export class UpdatePlatformSettingsDto {
  /** Allow brand-new users to create an account with "Continue with Google" */
  @IsOptional()
  @IsBoolean()
  googleSignupEnabled?: boolean;

  /** "<digits>-<chars>.apps.googleusercontent.com"; '' clears it */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  googleClientId?: string;

  /** Write-only. '' keeps the stored secret, null clears it */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  googleClientSecret?: string | null;

  /** Absolute https URL (http only for localhost); '' clears it */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  googleRedirectUri?: string;
}
