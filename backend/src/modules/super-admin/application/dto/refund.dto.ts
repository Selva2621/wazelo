import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** A refund already made in the gateway dashboard, recorded here. */
export class RecordRefundDto {
  /** Minor units (paise/cents) */
  @IsInt()
  @Min(1)
  amountInCents: number;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;

  /** The gateway's refund id (e.g. rfnd_...) */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  externalRefundId?: string;
}
