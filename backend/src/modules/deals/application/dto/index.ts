import { IsString, IsOptional, IsNumber, IsUUID, IsDateString } from 'class-validator';
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
}

export class MoveDealDto {
  @IsUUID()
  stageId: string;

  @IsOptional()
  @IsString()
  status?: 'OPEN' | 'WON' | 'LOST';
}
