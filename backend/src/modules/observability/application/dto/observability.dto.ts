import {
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
  ArrayMaxSize,
  IsNumber,
  IsDateString,
  IsIn,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMetricsDto {
  @IsString()
  @MaxLength(100)
  metric: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  orgId?: string;
}

export class QueryTimeSeriesDto {
  @IsString()
  @MaxLength(100)
  metric: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  orgId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 500;
}

export class CreateAlertRuleDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(100)
  metric: string;

  @IsIn(['gt', 'lt', 'gte', 'lte', 'eq'])
  condition: string;

  @IsNumber()
  threshold: number;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(86400)
  windowSeconds: number;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  channels: string[];

  /** Free-form per-channel settings (stored as JSON); must be a plain object */
  @IsObject()
  channelConfig: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  cooldownSeconds?: number;
}

/** Every field optional: send only what changes (e.g. `{ enabled: false }` to pause). */
export class UpdateAlertRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  metric?: string;

  @IsOptional()
  @IsIn(['gt', 'lt', 'gte', 'lte', 'eq'])
  condition?: string;

  @IsOptional()
  @IsNumber()
  threshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(86400)
  windowSeconds?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  channels?: string[];

  @IsOptional()
  @IsObject()
  channelConfig?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  cooldownSeconds?: number;
}

export class QueryAlertsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class QueryErrorsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  windowMinutes?: number = 60;
}
