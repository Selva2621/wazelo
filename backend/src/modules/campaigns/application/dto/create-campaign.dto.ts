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
  IsIn,
  IsInt,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType, CampaignAudienceType, LeadStatus, ContactSource } from '@prisma/client';

export class CampaignBatchAssignmentDto {
  @IsInt()
  @Min(1)
  @Max(1_000)
  batchNumber: number;

  @IsUUID('4')
  sessionId: string;
}

export class AudienceFiltersDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10_000)
  @IsUUID('4', { each: true })
  contactIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10_000)
  @IsUUID('4', { each: true })
  contactGroupIds?: string[];

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

  /** Legacy default WhatsApp number; new campaigns submit a session per batch. */
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  /** WhatsApp only: send round the clock instead of the campaign window (daily caps still apply) */
  @IsOptional()
  @IsBoolean()
  sendAnyTime?: boolean;

  /** WhatsApp numbers to send from; batches are dealt round-robin across them at run time. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  sessionIds?: string[];

  /** Optional per-batch overrides (batches without one follow the round-robin). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1_000)
  @ValidateNested({ each: true })
  @Type(() => CampaignBatchAssignmentDto)
  batchAssignments?: CampaignBatchAssignmentDto[];

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
