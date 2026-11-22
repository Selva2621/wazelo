import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** "Sign in with WhatsApp code", step 1 */
export class WhatsappCodeSendDto {
  @IsEmail()
  @MaxLength(320)
  email: string;
}

/** Step 2 */
export class WhatsappCodeVerifyDto {
  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsString()
  @Matches(/^\s*\d{6}\s*$/, { message: 'Enter the 6-digit code' })
  code: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
