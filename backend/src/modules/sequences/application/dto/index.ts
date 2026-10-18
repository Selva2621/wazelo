import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LeadStatus, SequenceTriggerType } from '@prisma/client';

/** What starts an always-on sequence for one contact */
export class SequenceTriggerDto {
  @IsEnum(SequenceTriggerType)
  type: SequenceTriggerType;

  /** DEAL_STAGE_CHANGED: the stage a deal is created in or moved to */
  @IsOptional()
  @IsUUID()
  stageId?: string;

  /** LEAD_STATUS_CHANGED: the status the lead changes to */
  @IsOptional()
  @IsEnum(LeadStatus)
  toStatus?: LeadStatus;
}

export class OutreachStepDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  messageBody: string;

  /** Wait after the previous step (first step: 0 = send right away) */
  @IsInt()
  @Min(0)
  @Max(60 * 24 * 30)
  delayMinutes: number;
}

/** One-click outreach to a scrape run's imported leads */
export class StartOutreachDto {
  @IsUUID()
  scrapeRunId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => OutreachStepDto)
  steps: OutreachStepDto[];

  /** Only leads still in NEW status (default true) */
  @IsOptional()
  @IsBoolean()
  onlyNew?: boolean;
}

export class StepConditionDto {
  @IsString()
  @MaxLength(255)
  keyword: string;

  @IsInt()
  @Min(0)
  goToStepOrder: number;
}

export class SequenceStepDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsEnum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'INTERACTIVE'])
  messageType: string = 'TEXT';

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  messageBody?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mediaMimeType?: string;

  /** Delay in minutes from previous step (default: 1440 = 24 hours). 0 = immediate. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(43200) // max 30 days
  delayMinutes?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepConditionDto)
  conditions?: StepConditionDto[];
}

export class CreateSequenceDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsUUID()
  sessionId: string;

  @IsEnum(['ALL', 'FILTERED'])
  audienceType: 'ALL' | 'FILTERED' = 'FILTERED';

  @IsOptional()
  audienceFilters?: Record<string, unknown>;

  /** Set → contacts join one at a time when this happens; the audience is ignored */
  @IsOptional()
  @ValidateNested()
  @Type(() => SequenceTriggerDto)
  trigger?: SequenceTriggerDto;

  @IsOptional()
  @IsBoolean()
  exitOnReply?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SequenceStepDto)
  steps: SequenceStepDto[];
}

export class UpdateSequenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  exitOnReply?: boolean;
}

export class AddSequenceStepDto extends SequenceStepDto {
  @IsInt()
  @Min(0)
  stepOrder: number;
}

export class UpdateSequenceStepDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  messageBody?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  mediaUrl?: string | null;

  @IsOptional()
  @IsString()
  mediaMimeType?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(43200)
  delayMinutes?: number;

  @IsOptional()
  @IsEnum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'INTERACTIVE'])
  messageType?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepConditionDto)
  conditions?: StepConditionDto[];
}
