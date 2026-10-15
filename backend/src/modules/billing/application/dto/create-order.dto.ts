import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  planId: string;

  /** Optional coupon — the order is priced at the discounted amount */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;
}

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code: string;

  @IsUUID()
  planId: string;
}

export class VerifyPaymentDto {
  @IsUUID()
  planId: string;

  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}
