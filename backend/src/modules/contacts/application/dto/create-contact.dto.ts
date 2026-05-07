import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ContactSource } from '@prisma/client';

export class CreateContactDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'Phone number must be a valid E.164 format (e.g. +1234567890)',
  })
  phoneNumber: string;

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
