import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  IsNotEmptyObject,
} from 'class-validator';
import { IntegrationProvider } from '@prisma/client';

export class CreateIntegrationConfigDto {
  @IsEnum(IntegrationProvider)
  provider: IntegrationProvider;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName: string;

  @IsNotEmptyObject()
  credentials: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}

export class UpdateIntegrationConfigDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsNotEmptyObject()
  credentials?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;

  @IsInt()
  @Min(1)
  version: number;
}
