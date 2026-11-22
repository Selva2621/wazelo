import { IsString, Length } from 'class-validator';

/** One-time code from the super admin portal's "Open Wazelo HQ". */
export class HqHandoffDto {
  @IsString()
  @Length(20, 200)
  code: string;
}
