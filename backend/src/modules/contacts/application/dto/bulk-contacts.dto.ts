import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { LeadStatus } from '@prisma/client';

/** Upper bound per bulk request — keeps one request's DB work and audit fan-out bounded. */
export const BULK_CONTACTS_MAX = 100;

export class BulkContactIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_CONTACTS_MAX)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  contactIds: string[];
}

export class BulkChangeLeadStatusDto extends BulkContactIdsDto {
  @IsEnum(LeadStatus)
  status: LeadStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class BulkAssignContactsDto extends BulkContactIdsDto {
  @IsUUID()
  ownerId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class BulkAddTagDto extends BulkContactIdsDto {
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message: 'Tag name must only contain letters, numbers, spaces, hyphens, and underscores',
  })
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color code (e.g. #FF5733)',
  })
  color?: string;
}
