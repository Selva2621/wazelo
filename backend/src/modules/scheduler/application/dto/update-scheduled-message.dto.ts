import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  IsObject,
} from 'class-validator';
import { MessageType } from '@prisma/client';

export class UpdateScheduledMessageDto {
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @IsOptional()
  @IsString()
  messageBody?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mediaMimeType?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
