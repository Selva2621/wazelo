import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsUrl,
  IsArray,
  IsBoolean,
  IsNumber,
  MaxLength,
  ValidateNested,
  ValidateIf,
  IsIn,
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

  @IsOptional()
  @IsUUID('4')
  scrapeRunId?: string;

  @IsOptional()
  @IsBoolean()
  hasPhone?: boolean;

  @IsOptional()
  @IsBoolean()
  hasWebsite?: boolean;

  @IsOptional()
  @IsNumber()
  minRating?: number;

  @IsOptional()
  @IsString()
  dateAdded?: 'last_7d' | 'last_30d' | 'last_90d';
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

  /** WHATSAPP (default) or EMAIL (sent from the workspace's email account) */
  @IsOptional()
  @IsIn(['WHATSAPP', 'EMAIL'])
  channel?: 'WHATSAPP' | 'EMAIL';

  /** Email campaigns: the subject line */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emailSubject?: string;

  /** WhatsApp messages are checked against 4096 characters in the use case; emails can be longer */
  @IsOptional()
  @IsString()
  @MaxLength(20000)
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

  /** The WhatsApp number it sends from (required for WhatsApp campaigns) */
  @ValidateIf((o: CreateCampaignDto) => o.channel !== 'EMAIL')
  @IsUUID()
  sessionId?: string;

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
