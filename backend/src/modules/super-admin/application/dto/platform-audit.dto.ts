import { IsOptional, IsInt, Min, Max, IsEnum, IsUUID, IsString, MaxLength, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PlatformAuditAction } from '@prisma/client';

export class ListPlatformAuditLogsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;

  @IsOptional() @IsEnum(PlatformAuditAction)
  action?: PlatformAuditAction;

  @IsOptional() @IsUUID()
  actorId?: string;

  @IsOptional() @IsUUID()
  orgId?: string;

  @IsOptional() @IsString() @MaxLength(100)
  targetType?: string;

  @IsOptional() @IsString() @MaxLength(255)
  targetId?: string;

  /** ISO date or date-time, inclusive */
  @IsOptional() @IsDateString()
  from?: string;

  /** ISO date or date-time, inclusive */
  @IsOptional() @IsDateString()
  to?: string;
}
