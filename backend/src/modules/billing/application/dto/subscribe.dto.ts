import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SubscribeDto {
  @IsUUID()
  planId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentMethodToken?: string; // Token from frontend payment form (Stripe/Razorpay)

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}

export class ChangePlanDto {
  @IsUUID()
  newPlanId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
