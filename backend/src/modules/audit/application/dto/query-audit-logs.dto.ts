import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsIn,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction } from '@prisma/client';

export class QueryAuditLogsDto {
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  targetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  traceId?: string;

  @IsOptional()
  @IsIn(['api', 'worker', 'automation', 'system'])
  source?: string;

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
  take?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;
}

export class AuditLogStatsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
