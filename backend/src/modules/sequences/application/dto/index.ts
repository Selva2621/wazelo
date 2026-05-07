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
} from 'class-validator';
import { Type } from 'class-transformer';

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
