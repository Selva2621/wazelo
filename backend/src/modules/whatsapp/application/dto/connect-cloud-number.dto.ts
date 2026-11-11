import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** An official number from Meta: App Dashboard → WhatsApp → API Setup */
export class ConnectCloudNumberDto {
  @Transform(trim)
  @IsString()
  @Matches(/^\d{5,30}$/, { message: 'Phone number ID is the long number from API Setup (digits only)' })
  phoneNumberId!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^\d{5,30}$/, { message: 'WhatsApp Business Account ID is digits only' })
  wabaId!: string;

  @Transform(trim)
  @IsString()
  @MinLength(20, { message: 'Paste the full permanent access token' })
  @MaxLength(1024)
  accessToken!: string;

  /** Checks that incoming webhooks (replies, delivery ticks) really come from Meta */
  @Transform(trim)
  @IsString()
  @Matches(/^[a-f0-9]{32}$/i, { message: 'App Secret is 32 letters and numbers (App Dashboard → Settings → Basic)' })
  appSecret!: string;
}

/** Replace an expired token or a changed app secret */
export class UpdateCloudCredentialsDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(20, { message: 'Paste the full permanent access token' })
  @MaxLength(1024)
  accessToken?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(/^[a-f0-9]{32}$/i, { message: 'App Secret is 32 letters and numbers (App Dashboard → Settings → Basic)' })
  appSecret?: string;
}
