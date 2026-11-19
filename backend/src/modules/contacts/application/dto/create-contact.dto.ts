import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsIn,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ContactSource } from '@prisma/client';
import { COUNTRY_CODES } from '@/shared/constants/countries';

export class CreateContactDto {
  /** With or without country code — "98765 43210" is read as `country`'s; stored as E.164 */
  @IsString()
  @Matches(/^\+?[\d\s().-]{7,20}$/, {
    message: 'Phone number must be digits, optionally with a country code (e.g. +919876543210)',
  })
  phoneNumber: string;

  /** Country of a number typed without a country code; defaults to the org's */
  @IsOptional()
  @IsIn(COUNTRY_CODES)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsEnum(ContactSource)
  source?: ContactSource;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
