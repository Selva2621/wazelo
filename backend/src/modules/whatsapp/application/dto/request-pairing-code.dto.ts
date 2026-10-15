import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestPairingCodeDto {
  /** WhatsApp number with country code, e.g. +919876543210 — spaces and dashes are ignored */
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s\-()]/g, '') : value))
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phoneNumber must be a WhatsApp number with country code, e.g. +919876543210',
  })
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}
