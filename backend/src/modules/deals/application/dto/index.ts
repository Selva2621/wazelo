import { IsString, IsOptional, IsNumber, IsUUID, IsDateString, IsIn, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePipelineDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  stages?: { name: string; order: number; color?: string; isWonStage?: boolean; isLostStage?: boolean }[];
}

export class UpdatePipelineDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateDealDto {
  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @IsUUID()
  stageId: string;

  @IsUUID()
  contactId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  value?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  expectedClose?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}

export class UpdateDealDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  value?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  expectedClose?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: 'OPEN' | 'WON' | 'LOST';

  /** Next follow-up time; null clears it (marks the follow-up done) */
  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  followUpNote?: string | null;
}

export class ListFollowUpsQueryDto {
  /** due = overdue + due by end of today (default); upcoming = next 7 days */
  @IsOptional()
  @IsIn(['due', 'upcoming'])
  scope?: 'due' | 'upcoming';

  /** Viewer's IANA time zone, so "today" ends at their midnight */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tz?: string;
}

export class SaveScopeDto {
  @IsString()
  @MaxLength(1500)
  summary: string;
}

export class MoveDealDto {
  @IsUUID()
  stageId: string;

  @IsOptional()
  @IsString()
  status?: 'OPEN' | 'WON' | 'LOST';
}
