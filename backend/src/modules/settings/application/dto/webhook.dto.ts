import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  IsUrl,
  IsObject,
  IsInt,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { WebhookDeliveryStatus } from '@prisma/client';

const VALID_WEBHOOK_EVENTS = [
  'MESSAGE_RECEIVED',
  'MESSAGE_SENT',
  'MESSAGE_DELIVERED',
  'MESSAGE_FAILED',
  'CONTACT_CREATED',
  'CONTACT_UPDATED',
  'CAMPAIGN_COMPLETED',
  'CAMPAIGN_FAILED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'SUBSCRIPTION_CHANGED',
] as const;

export class CreateWebhookDto {
  @IsUrl({ require_tld: false }) // Allow localhost for testing
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  events: string[];

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  timeoutMs?: number;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  timeoutMs?: number;

  @IsInt()
  @Min(1)
  version: number;
}

export class ListWebhookDeliveriesQueryDto {
  @IsOptional()
  @IsEnum(WebhookDeliveryStatus)
  status?: WebhookDeliveryStatus;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
