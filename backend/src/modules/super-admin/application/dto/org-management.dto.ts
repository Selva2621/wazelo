import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SuspendOrgDto {
  /** Shown in the audit log and kept on the org until reactivation */
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class AdminCancelSubscriptionDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}

export class AdminChangePlanDto {
  @IsUUID()
  planId: string;
}

export class AdminExtendTrialDto {
  @IsInt()
  @Min(1)
  @Max(90)
  days: number;
}

/** Super admin edit of an org's identity. Send only what changes. */
export class AdminUpdateOrgDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  /** Lowercase words joined by hyphens; must be unique */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug may only contain lowercase letters, numbers and single hyphens' })
  slug?: string;

  /** IANA zone, e.g. Asia/Kolkata (checked against the runtime's zone list) */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}

export class AdminDeleteOrgDto {
  /** Must equal the org name — guards against deleting the wrong one */
  @IsString()
  @MaxLength(255)
  confirmName: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
