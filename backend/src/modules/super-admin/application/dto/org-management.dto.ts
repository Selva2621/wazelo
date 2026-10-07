import { IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
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
