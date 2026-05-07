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
