import { IsOptional, IsEnum, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { AutomationExecutionStatus } from '@prisma/client';

export class ListExecutionLogsDto {
  @IsOptional()
  @IsUUID()
  ruleId?: string;

  @IsOptional()
  @IsEnum(AutomationExecutionStatus)
  status?: AutomationExecutionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
