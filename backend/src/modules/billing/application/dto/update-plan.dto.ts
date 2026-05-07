import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceInCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxWhatsappSessions?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxMessagesPerMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxCampaignsPerMonth?: number;

  @IsOptional()
  @IsBoolean()
  campaignsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  automationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  apiEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxApiCallsPerMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  aiCreditsPerMonth?: number;

  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxMessageTemplates?: number;

  @IsOptional()
  @IsBoolean()
  shopifyEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxShopifyStores?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  softLimitPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  gracePeriodDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
