import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateScoringRuleDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  signal: string; // contact_created, status_changed, message_received, note_added, tag_added

  @IsOptional()
  condition?: Record<string, unknown>;

  @IsInt()
  @Min(-100)
  @Max(100)
  points: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxPerContact?: number;
}

export class UpdateScoringRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  signal?: string;

  @IsOptional()
  condition?: Record<string, unknown> | null;

  @IsOptional()
  @IsInt()
  @Min(-100)
  @Max(100)
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxPerContact?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class SetContactScoreDto {
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
