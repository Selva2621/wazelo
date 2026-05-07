import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  IsObject,
} from 'class-validator';
import { SettingScope } from '@prisma/client';

export class CreateFeatureFlagDto {
  @IsEnum(SettingScope)
  scope: SettingScope;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  featureKey: string;

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsInt()
  @Min(1)
  version: number;
}

export class ListFeatureFlagsQueryDto {
  @IsOptional()
  @IsEnum(SettingScope)
  scope?: SettingScope;
}

export class ResolveFeatureFlagQueryDto {
  @IsString()
  @MaxLength(100)
  featureKey: string;
}
