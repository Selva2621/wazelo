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
import { EscalationLevelDto } from './create-sla-policy.dto';

export class UpdateSlaPolicyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(SlaMetricType)
  metricType?: SlaMetricType;

  @IsOptional()
  @IsEnum(SlaPriority)
  priority?: SlaPriority;

  @IsOptional()
  @IsInt()
  @Min(SLA_CONFIG.MIN_THRESHOLD_MS)
  @Max(SLA_CONFIG.MAX_THRESHOLD_MS)
  thresholdMs?: number;

  @IsOptional()
  @IsInt()
  @Min(SLA_CONFIG.MIN_THRESHOLD_MS)
  @Max(SLA_CONFIG.MAX_THRESHOLD_MS)
  warningThresholdMs?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  businessHoursOnly?: boolean;

  @ValidateIf((o) => o.businessHoursOnly === true)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  businessHoursStart?: number;

  @ValidateIf((o) => o.businessHoursOnly === true)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  businessHoursEnd?: number;

  @ValidateIf((o) => o.businessHoursOnly === true)
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  businessDays?: number[];

  @ValidateIf((o) => o.businessHoursOnly === true)
  @IsOptional()
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
