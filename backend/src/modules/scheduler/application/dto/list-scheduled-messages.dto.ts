import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduledMessageStatus } from '@prisma/client';

export class ListScheduledMessagesDto {
  @IsOptional()
  @IsEnum(ScheduledMessageStatus)
  status?: ScheduledMessageStatus;

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
