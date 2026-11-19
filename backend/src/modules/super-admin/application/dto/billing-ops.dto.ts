import { CouponKind } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BILLING_CURRENCIES } from '@/shared/constants/billing-currencies';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

// ── Account credits ──

/** Grant or revoke account credit. Minor units (paise/cents). */
export class CreditAdjustmentDto {
  @IsInt() @Min(1) @Max(2_000_000_000)
  amountInCents: number;

  @Transform(upper) @IsIn(BILLING_CURRENCIES, { message: 'currency must be INR or USD' })
  currency: string;

  @Transform(trim) @IsString() @MinLength(3) @MaxLength(500)
  reason: string;
}

// ── Manual invoices ──

export class ManualInvoiceLineDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(200)
  description: string;

  @IsInt() @Min(1) @Max(100_000)
  quantity: number;

  /** Minor units */
  @IsInt() @Min(0) @Max(2_000_000_000)
  unitAmountInCents: number;
}

export class CreateManualInvoiceDto {
  @IsUUID()
  orgId: string;

  @Transform(upper) @IsIn(BILLING_CURRENCIES, { message: 'currency must be INR or USD' })
  currency: string;

  @IsDateString()
  dueDate: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000)
  note?: string;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ManualInvoiceLineDto)
  lineItems: ManualInvoiceLineDto[];
}

export class MarkInvoicePaidDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  note?: string;

  @IsOptional() @IsDateString()
  paidAt?: string;
}

export class VoidInvoiceDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(500)
  reason: string;
}

// ── Coupons ──

export class CreateCouponDto {
  @Transform(upper) @IsString()
  @Matches(/^[A-Z0-9_-]{3,40}$/, { message: 'code must be 3-40 characters: A-Z, 0-9, _ or -' })
  code: string;

  @IsEnum(CouponKind)
  kind: CouponKind;

  /** PERCENT only */
  @IsOptional() @IsInt() @Min(1) @Max(100)
  percentOff?: number;

  /** FIXED only — minor units in `currency` */
  @IsOptional() @IsInt() @Min(1) @Max(2_000_000_000)
  amountOffInCents?: number;

  /** Required for FIXED */
  @IsOptional() @Transform(upper) @IsIn(BILLING_CURRENCIES, { message: 'currency must be INR or USD' })
  currency?: string;

  @IsOptional() @IsInt() @Min(1) @Max(10_000_000)
  maxRedemptions?: number;

  @IsOptional() @IsDateString()
  validFrom?: string;

  @IsOptional() @IsDateString()
  validUntil?: string;

  /** Empty / omitted = all plans */
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsUUID('all', { each: true })
  appliesToPlanIds?: string[];

  /** Only `true` is supported for now (checked in the use case) */
  @IsOptional() @IsBoolean()
  firstPaymentOnly?: boolean;
}
