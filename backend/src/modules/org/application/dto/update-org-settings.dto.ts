import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsObject,
  IsEnum,
  IsIn,
} from 'class-validator';
import { OrgType } from '@prisma/client';
import { FREELANCER_TYPES, FreelancerType } from '@/shared/constants/freelancer-profiles';

export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsEnum(OrgType)
  orgType?: OrgType;

  /** For FREELANCER orgs: what they do — shapes the default templates */
  @IsOptional()
  @IsIn(FREELANCER_TYPES)
  freelancerType?: FreelancerType;

  /** Their service in their own words, when freelancerType is OTHER */
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
