import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsIn,
  MaxLength,
  MinLength,
  IsNotEmpty,
  IsInt,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { SettingScope } from '@prisma/client';

export class CreateSettingDto {
  @IsEnum(SettingScope)
  scope: SettingScope;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  category: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  key: string;

  @IsNotEmpty()
  value: unknown;

  @IsIn(['string', 'number', 'boolean', 'json'])
  valueType: 'string' | 'number' | 'boolean' | 'json';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;
}

export class UpdateSettingDto {
  @IsNotEmpty()
  value: unknown;

  @IsOptional()
  @IsIn(['string', 'number', 'boolean', 'json'])
  valueType?: 'string' | 'number' | 'boolean' | 'json';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;

  @IsInt()
  @Min(1)
  version: number;
}

export class ListSettingsQueryDto {
  @IsOptional()
  @IsEnum(SettingScope)
  scope?: SettingScope;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class ResolveSettingQueryDto {
  @IsString()
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  key?: string;
}
