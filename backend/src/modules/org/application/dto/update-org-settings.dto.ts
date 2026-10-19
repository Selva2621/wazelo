import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsObject,
  IsEnum,
  IsIn,
  IsArray,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';
import { OrgType } from '@prisma/client';
import { FREELANCER_TYPES, FreelancerType } from '@/shared/constants/freelancer-profiles';
import { COUNTRY_CODES, CURRENCY_CODES } from '@/shared/constants/countries';

export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsEnum(OrgType)
  orgType?: OrgType;

  /** For FREELANCER orgs: what they do, one or more — shapes the default templates */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(FREELANCER_TYPES, { each: true })
  freelancerTypes?: FreelancerType[];

  /** Their service in their own words, when freelancerTypes includes OTHER */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  freelancerService?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Za-z_\/]+$/, {
    message:
      'Timezone must be a valid IANA timezone identifier (e.g. America/New_York)',
  })
  timezone?: string;

  /** ISO country code — sets the default phone country code (and currency when none is sent) */
  @IsOptional()
  @IsIn(COUNTRY_CODES)
  country?: string;

  @IsOptional()
  @IsIn(CURRENCY_CODES)
  currency?: string;

  @IsOptional()
  @IsObject()
  branding?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}
