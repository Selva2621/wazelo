import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsObject,
  IsEnum,
} from 'class-validator';
import { OrgType } from '@prisma/client';

export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsEnum(OrgType)
  orgType?: OrgType;
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
