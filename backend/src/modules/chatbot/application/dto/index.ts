import { IsString, IsOptional, IsBoolean, IsArray, IsNotEmpty, IsNotEmptyObject, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFlowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmptyObject()
  trigger: { type: string; value?: string };

  @IsOptional()
  @IsArray()
  nodes?: { type: string; data: Record<string, unknown>; position: Record<string, unknown>; nextNodes: unknown[] }[];

  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @IsOptional()
  @IsString()
  aiSystemPrompt?: string;

  @IsOptional()
  @IsBoolean()
  useKnowledgeBase?: boolean;

  @IsOptional()
  @IsArray()
  productIds?: string[];
}

export class UpdateFlowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  trigger?: { type: string; value?: string };

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @IsOptional()
  @IsString()
  aiSystemPrompt?: string;

  @IsOptional()
  @IsBoolean()
  useKnowledgeBase?: boolean;

  @IsOptional()
  @IsArray()
  productIds?: string[];
}

export class SaveNodesDto {
  @IsArray()
  nodes: { id?: string; type: string; data: Record<string, unknown>; position: Record<string, unknown>; nextNodes: unknown[] }[];
}

export class SimulateFlowDto {
  @IsString()
  @IsNotEmpty()
  messageBody: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}
