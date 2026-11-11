import { IsString, IsOptional, IsIn, IsEmail, MaxLength, Matches, IsObject } from 'class-validator';

/** Dev-only test lead: the answers a Meta lead form would have sent */
export class SimulateLeadAdDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @Matches(/^[+\d\s()-]{6,30}$/, { message: 'Enter a phone number' })
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['facebook', 'instagram'])
  platform?: 'facebook' | 'instagram';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  formId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  campaignName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  adName?: string;

  /** Extra form answers, e.g. { city: "Chennai" } → {{lead.city}} */
  @IsOptional()
  @IsObject()
  fields?: Record<string, string>;
}
