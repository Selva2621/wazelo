import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { BillingCycle } from '@prisma/client';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens',
  })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  description?: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsInt()
  @Min(0)
  priceInCents: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsInt()
  @Min(0)
  trialDays?: number;

  @IsInt()
  @Min(1)
  maxUsers: number;

  @IsInt()
  @Min(1)
  maxWhatsappSessions: number;

  @IsInt()
  @Min(0)
  maxMessagesPerMonth: number;

  @IsInt()
  @Min(0)
  maxCampaignsPerMonth: number;

  @IsBoolean()
  campaignsEnabled: boolean;

  @IsBoolean()
  automationEnabled: boolean;

  @IsBoolean()
  apiEnabled: boolean;

  @IsInt()
  @Min(0)
  maxApiCallsPerMonth: number;

  @IsInt()
  @Min(0)
  aiCreditsPerMonth: number;

  @IsBoolean()
  aiEnabled: boolean;

  @IsInt()
  @Min(0)
  maxMessageTemplates: number;

  @IsBoolean()
  shopifyEnabled: boolean;

  @IsInt()
  @Min(0)
  maxShopifyStores: number;

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
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
