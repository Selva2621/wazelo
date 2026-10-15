import { Transform } from 'class-transformer';
import { IsBoolean, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SetKillSwitchDto {
  /** true = turn the feature OFF for every org */
  @IsBoolean()
  disabled: boolean;

  /** Required when disabling */
  @ValidateIf((o) => o.disabled === true || o.reason != null)
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
