import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsEnum,
  IsNumber,
  Min,
  IsUrl,
  Matches,
  IsArray,
  ArrayMaxSize,
  IsInt,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Product Category DTOs ───────────────────────────────────────────────────

export class CreateProductCategoryDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (e.g. #FF5733)' })
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateProductCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (e.g. #FF5733)' })
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  isActive?: boolean;
}

// ─── Product DTOs ────────────────────────────────────────────────────────────

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: string;

  /** null removes the product from its brand */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  brandId?: string | null;

  /** People who handle this product's leads (round-robin) */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  leadHandlerIds?: string[];

  /** Remind the lead's owner after this many minutes without contact */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  leadReminderMinutes?: number;
}

// ─── Brand DTOs ──────────────────────────────────────────────────────────────

export class CreateBrandDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;

  /** Gets the brand's end-of-day lead summary */
  @IsOptional()
  @IsUUID()
  managerId?: string;

  /** Default WhatsApp number for this brand */
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  managerId?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  sessionId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class AssignProductDto {
  @IsUUID()
  contactId: string;

  @IsUUID()
  productId: string;
}
