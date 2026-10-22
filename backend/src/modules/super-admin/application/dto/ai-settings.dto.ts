import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AI_PROVIDERS } from '@/modules/ai/domain/services/ai-provider.service';

/** Every field optional. Action costs are checked in the use case. */
export class UpdateAiSettingsDto {
  @IsOptional()
  @IsIn(AI_PROVIDERS)
  provider?: string;

  /** e.g. openai/gpt-4o-mini on OpenRouter; '' clears it (env AI_MODEL applies) */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  /** Write-only. '' keeps the stored key, null clears it */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string | null;

  /** { [action]: credits } */
  @IsOptional()
  @IsObject()
  actionCosts?: Record<string, number>;
}

/** Try a provider before saving it. Without apiKey the stored key is used. */
export class TestAiConnectionDto {
  @IsIn(AI_PROVIDERS)
  provider: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  model: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;
}

/** POST body, so a typed key never lands in a URL or access log */
export class ListAiModelsDto {
  @IsIn(AI_PROVIDERS)
  provider: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;
}

export class CreateAiCreditPackDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  credits: number;

  /** Minor units (paise / cents) */
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(100_000_000)
  priceInCents: number;

  @Matches(/^[A-Z]{3}$/)
  currency: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class UpdateAiCreditPackDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  credits?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(100_000_000)
  priceInCents?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}
