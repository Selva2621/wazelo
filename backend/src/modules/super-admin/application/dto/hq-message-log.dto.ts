import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageStatus, WhatsAppProvider } from '@prisma/client';
import { HQ_MESSAGE_KINDS } from '../../domain/services/hq-message-log';

export class ListHqMessageLogQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;

  @IsOptional() @IsEnum(MessageStatus)
  status?: MessageStatus;

  /** What the message was for (sign-in code, trial alert…) */
  @IsOptional() @IsIn(HQ_MESSAGE_KINDS)
  kind?: (typeof HQ_MESSAGE_KINDS)[number];

  /** QR session or official Cloud API number */
  @IsOptional() @IsEnum(WhatsAppProvider)
  provider?: WhatsAppProvider;

  /** Digits of the recipient's number (any part) */
  @IsOptional() @IsString() @MaxLength(20)
  search?: string;

  /** ISO date or date-time, inclusive */
  @IsOptional() @IsDateString()
  from?: string;

  /** ISO date or date-time, inclusive */
  @IsOptional() @IsDateString()
  to?: string;
}
