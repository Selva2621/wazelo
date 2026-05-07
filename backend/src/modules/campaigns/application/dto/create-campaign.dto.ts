import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsUrl,
  IsArray,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType, CampaignAudienceType, LeadStatus, ContactSource } from '@prisma/client';

export class AudienceFiltersDto {
  @IsOptional()
  @IsArray()
  @IsEnum(LeadStatus, { each: true })
  leadStatuses?: LeadStatus[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  ownerIds?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(ContactSource, { each: true })
  sources?: ContactSource[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  teamIds?: string[];
}

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(MessageType)
  messageType: MessageType;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  messageBody?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mediaMimeType?: string;

  @IsEnum(CampaignAudienceType)
  audienceType: CampaignAudienceType;

  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFiltersDto)
  audienceFilters?: AudienceFiltersDto;

  @IsUUID()
  sessionId: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;

  @IsOptional()
  @IsUUID('4')
  productId?: string;
}
