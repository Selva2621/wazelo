import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsUrl,
  MaxLength,
  ValidateNested,
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
}
