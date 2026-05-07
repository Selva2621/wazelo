import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  MaxLength,
  IsObject,
  IsUUID,
} from 'class-validator';

import { MessageType } from '@prisma/client';

export class CreateScheduledMessageDto {
  @IsUUID()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  contactPhone: string;

  @IsEnum(MessageType)
  messageType: MessageType;

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

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsUUID('4')
  productId?: string;
}
