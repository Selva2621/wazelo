import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  CUSTOM = 'custom',
}

export class AnalyticsQueryDto {
  @IsEnum(AnalyticsPeriod)
  period: AnalyticsPeriod;

  @ValidateIf((o) => o.period === AnalyticsPeriod.CUSTOM)
  @IsDateString()
  startDate?: string;

  @ValidateIf((o) => o.period === AnalyticsPeriod.CUSTOM)
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-12)
  @Max(14)
  timezoneOffsetHours?: number;
}

export class BackfillDto {
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
