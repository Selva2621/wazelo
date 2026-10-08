import { EntitlementKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SetEntitlementOverrideDto {
  @IsEnum(EntitlementKind)
  kind: EntitlementKind;

  /** LIMIT: UsageMetricType name. FEATURE: campaigns | automation | api | ai | shopify. Checked in the use case. */
  @IsString() @MaxLength(50)
  key: string;

  /** LIMIT only — 0 means unlimited */
  @ValidateIf((o) => o.kind === EntitlementKind.LIMIT)
  @IsInt() @Min(0)
  limitValue?: number;

  /** FEATURE only */
  @ValidateIf((o) => o.kind === EntitlementKind.FEATURE)
  @IsBoolean()
  enabled?: boolean;

  @Transform(trim) @IsString() @MinLength(3) @MaxLength(500)
  reason: string;

  /** Omit for a permanent override */
  @IsOptional() @IsDateString()
  expiresAt?: string;
}
