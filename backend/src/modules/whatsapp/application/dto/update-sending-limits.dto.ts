import { IsBoolean, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';
import { SENDING_LIMIT_BOUNDS } from '@/common/constants';

/**
 * Per-number sending limits. With nothing set (`{}`) a number has no daily cap:
 * only the org's plan message limit applies. Omit a field (or send null) to unset it.
 */
export class UpdateSendingLimitsDto {
  /** Opt into Wazelo's warm-up daily caps for a brand-new number */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsBoolean()
  warmupEnabled?: boolean | null;

  /** Start at this warm-up stage (1–4): for a number that was already in regular use before linking */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(SENDING_LIMIT_BOUNDS.WARMUP_STAGE_MIN)
  @Max(SENDING_LIMIT_BOUNDS.WARMUP_STAGE_MAX)
  warmupStage?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(SENDING_LIMIT_BOUNDS.DAILY_BULK_MAX)
  dailyBulkCap?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(SENDING_LIMIT_BOUNDS.DAILY_COLD_MAX)
  dailyColdCap?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(SENDING_LIMIT_BOUNDS.BULK_GAP_MIN_MS)
  @Max(SENDING_LIMIT_BOUNDS.BULK_GAP_MAX_MS)
  bulkGapMinMs?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(SENDING_LIMIT_BOUNDS.BULK_GAP_MIN_MS)
  @Max(SENDING_LIMIT_BOUNDS.BULK_GAP_MAX_MS)
  bulkGapMaxMs?: number | null;
}
