import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsInt,
  IsBoolean,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SlaMetricType, SlaPriority, SlaBreachStatus } from '@prisma/client';

export class ListSlaPoliciesQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsEnum(SlaMetricType)
  metricType?: SlaMetricType;

  @IsOptional()
  @IsEnum(SlaPriority)
  priority?: SlaPriority;
}

export class ListSlaTrackingsQueryDto {
  @IsOptional()
  @IsUUID()
  policyId?: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isBreached?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isWarning?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

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

export class ListSlaBreachesQueryDto {
  @IsOptional()
  @IsUUID()
  policyId?: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsEnum(SlaBreachStatus)
  status?: SlaBreachStatus;

  @IsOptional()
  @IsEnum(SlaMetricType)
  metricType?: SlaMetricType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

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

export class SlaPerformanceQueryDto {
  @IsOptional()
  @IsUUID()
  policyId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
