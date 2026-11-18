import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsUrl,
  MaxLength,
  ValidateNested,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType, CampaignAudienceType } from '@prisma/client';
import { AudienceFiltersDto } from './create-campaign.dto';

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

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

  @IsOptional()
  @IsEnum(CampaignAudienceType)
  audienceType?: CampaignAudienceType;

  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFiltersDto)
  audienceFilters?: AudienceFiltersDto;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  /** Official numbers: switch the draft to this Meta-approved template */
  @IsOptional()
  @IsUUID()
  cloudTemplateId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  cloudTemplateParams?: string[];

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  cloudTemplateHeaderImageUrl?: string;
}
