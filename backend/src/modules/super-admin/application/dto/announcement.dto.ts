import { AnnouncementSeverity, AnnouncementTarget } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateAnnouncementDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(200)
  title: string;

  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2000)
  body: string;

  @IsOptional() @IsEnum(AnnouncementSeverity)
  severity?: AnnouncementSeverity;

  @IsEnum(AnnouncementTarget)
  targetType: AnnouncementTarget;

  /** Required when targetType = PLAN */
  @ValidateIf((o) => o.targetType === AnnouncementTarget.PLAN)
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  targetPlanSlug?: string;

  /** Required when targetType = ORG */
  @ValidateIf((o) => o.targetType === AnnouncementTarget.ORG)
  @IsUUID()
  targetOrgId?: string;

  /** Defaults to now */
  @IsOptional() @IsDateString()
  startsAt?: string;

  @IsOptional() @IsDateString()
  endsAt?: string;

  @IsOptional() @IsBoolean()
  dismissible?: boolean;
}
