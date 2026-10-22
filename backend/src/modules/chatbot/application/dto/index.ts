import {
  IsString, IsOptional, IsBoolean, IsArray, IsNotEmpty, IsNotEmptyObject, ValidateNested, IsObject,
  IsInt, Min, Max, MaxLength, ArrayMaxSize,
} from 'class-validator';
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

/** PUT /chatbot/behavior — how the AI bot hands chats over, and its hours. */
export class BotBehaviorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  handoffMessage?: string;

  @IsOptional()
  @IsBoolean()
  hoursEnabled?: boolean;

  /** Minutes from midnight in the org timezone */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  openMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  closeMinute?: number;

  /** 0 = Sunday … 6 = Saturday */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  openDays?: number[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  afterHoursMessage?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  pauseHours?: number;
}
