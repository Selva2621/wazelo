import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class FreelancerPitchDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) intro: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) portfolio: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) followup: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) packages: string;
}

export class CreateFreelancerTypeDto {
  /** Card title, e.g. "Home Baker" (its key is made from this and never changes) */
  @IsString() @IsNotEmpty() @MaxLength(60) label: string;
  /** Card subtitle */
  @IsString() @IsNotEmpty() @MaxLength(120) description: string;
  /** Fills {{lead.service}}, e.g. "custom cakes and baking" */
  @IsString() @IsNotEmpty() @MaxLength(120) serviceLabel: string;
  /** Words people search or type for this work */
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(60, { each: true }) keywords: string[];
  @ValidateNested() @Type(() => FreelancerPitchDto) pitch: FreelancerPitchDto;
}

export class UpdateFreelancerTypeDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) label?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) description?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) serviceLabel?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(60, { each: true }) keywords?: string[];
  @IsOptional() @ValidateNested() @Type(() => FreelancerPitchDto) pitch?: FreelancerPitchDto;
  /** false hides it from setup; orgs that picked it keep their templates */
  @IsOptional() @IsBoolean() isActive?: boolean;
}
