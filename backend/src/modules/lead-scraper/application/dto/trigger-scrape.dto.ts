import {
  IsEnum,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsBoolean,
  IsIn,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScrapeSource } from '@prisma/client';

const WEBSITE_ISSUES = ['noSsl', 'notMobile', 'noPixel', 'noAnalytics'] as const;

export class LeadFiltersDto {
  // ── All sources ──
  @IsOptional() @IsBoolean() newOnly?: boolean;
  @IsOptional() @IsBoolean() skipExistingContacts?: boolean;

  // ── Google Maps ──
  @IsOptional() @IsNumber() @Min(1) @Max(5) minRating?: number;
  @IsOptional() @IsInt() @Min(0) minReviews?: number;
  @IsOptional() @IsInt() @Min(0) maxReviews?: number;
  @IsOptional() @IsBoolean() hasPhone?: boolean;
  @IsOptional() @IsBoolean() mobileOnly?: boolean;
  @IsOptional() @IsBoolean() noWebsite?: boolean;
  @IsOptional() @IsBoolean() skipClosed?: boolean;
  @IsOptional() @IsBoolean() findEmails?: boolean;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(100, { each: true })
  includeCategories?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(100, { each: true })
  excludeCategories?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(100, { each: true })
  excludeWords?: string[];

  @IsOptional() @IsIn(['has', 'none']) social?: 'has' | 'none';
  @IsOptional() @IsBoolean() unclaimedOnly?: boolean;
  @IsOptional() @IsInt() @Min(0) maxPhotos?: number;
  @IsOptional() @IsBoolean() open24h?: boolean;
  @IsOptional() @IsBoolean() openWeekends?: boolean;

  @IsOptional() @IsArray() @ArrayMaxSize(4) @IsInt({ each: true }) @Min(1, { each: true }) @Max(4, { each: true })
  priceLevels?: number[];

  /** Each area is a separate Maps search — capped to keep a run's length reasonable */
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(100, { each: true })
  areas?: string[];

  @IsOptional() @IsNumber() @Min(0.5) @Max(50) radiusKm?: number;
  @IsOptional() @IsInt() @Min(1) @Max(36) activeWithinMonths?: number;

  @IsOptional() @IsArray() @IsIn(WEBSITE_ISSUES, { each: true })
  websiteIssues?: (typeof WEBSITE_ISSUES)[number][];

  // ── Job boards ──
  @IsOptional() @IsNumber() @Min(0) minBudget?: number;
  @IsOptional() @IsNumber() @Min(0) maxBudget?: number;
  @IsOptional() @IsIn(['fixed', 'hourly']) budgetType?: 'fixed' | 'hourly';
  @IsOptional() @IsInt() @Min(1) @Max(90) postedWithinDays?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(100, { each: true })
  includeSkills?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(100, { each: true })
  excludeSkills?: string[];

  @IsOptional() @IsBoolean() paymentVerified?: boolean;
  @IsOptional() @IsInt() @Min(0) maxProposals?: number;
  @IsOptional() @IsString() @MaxLength(100) clientCountry?: string;
}

export class TriggerScrapeDto {
  @IsEnum(ScrapeSource)
  source: ScrapeSource;

  @IsString()
  keywords: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  maxResults?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => LeadFiltersDto)
  filters?: LeadFiltersDto;
}
