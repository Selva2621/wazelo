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

export class LiveChannelsQueryDto {
  /** Exact offset (local minus UTC) in minutes, e.g. 330 for India. Wins over the hours field. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-720)
  @Max(840)
  timezoneOffsetMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-12)
  @Max(14)
  timezoneOffsetHours?: number;
}

export class LiveWaitingQueryDto {
  /** Show chats waiting at least this long (minutes). Default 15. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  minMinutes?: number;
}

export class BackfillDto {
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
