import {
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsArray,
  IsUUID,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  ValidateIf,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SlaMetricType, SlaPriority } from '@prisma/client';
import { SLA_CONFIG } from '@/common/constants';

export class EscalationLevelDto {
  @IsInt()
  @Min(60_000) // at least 1 minute
  delayMs: number;

  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(10)
  userIds: string[];
}

export class CreateSlaPolicyDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(SlaMetricType)
  metricType: SlaMetricType;

  @IsOptional()
  @IsEnum(SlaPriority)
  priority?: SlaPriority;

  @IsInt()
  @Min(SLA_CONFIG.MIN_THRESHOLD_MS)
  @Max(SLA_CONFIG.MAX_THRESHOLD_MS)
  thresholdMs: number;

  @IsOptional()
  @IsInt()
  @Min(SLA_CONFIG.MIN_THRESHOLD_MS)
  @Max(SLA_CONFIG.MAX_THRESHOLD_MS)
  warningThresholdMs?: number;

  @IsOptional()
  @IsBoolean()
  businessHoursOnly?: boolean;

  @ValidateIf((o) => o.businessHoursOnly === true)
  @IsInt()
  @Min(0)
  @Max(23)
  businessHoursStart?: number;

  @ValidateIf((o) => o.businessHoursOnly === true)
  @IsInt()
  @Min(0)
  @Max(23)
  businessHoursEnd?: number;

  @ValidateIf((o) => o.businessHoursOnly === true)
  @IsArray()
  @IsInt({ each: true })
  businessDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat

  @ValidateIf((o) => o.businessHoursOnly === true)
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  notifyOnWarning?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnBreach?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(20)
  notifyUserIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalationLevelDto)
  @ArrayMaxSize(SLA_CONFIG.MAX_ESCALATION_LEVELS)
  escalationLevels?: EscalationLevelDto[];
}
