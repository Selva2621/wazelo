import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsDateString, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID,
  Length, Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { ProposalStatus } from '@prisma/client';
import { MAX_ITEMS } from '../../domain/services/proposal-math';

export class CreateProposalDto {
  @IsUUID()
  contactId: string;

  @IsOptional()
  @IsUUID()
  dealId?: string;
}

export class ProposalItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000_000)
  unitPrice: number;
}

export class UpdateProposalDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  intro?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  scope?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => ProposalItemDto)
  items?: ProposalItemDto[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxPercent?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Za-z]{3}$/)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  terms?: string | null;

  @IsOptional()
  @IsDateString()
  validUntil?: string | null;
}

export class ListProposalsQuery {
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  dealId?: string;

  @IsOptional()
  @IsEnum(ProposalStatus)
  status?: ProposalStatus;
}

export class ImproveSectionDto {
  @IsIn(['intro', 'scope', 'terms'])
  section: 'intro' | 'scope' | 'terms';

  @IsString()
  @Length(1, 4000)
  text: string;
}

export class AcceptProposalDto {
  @IsString()
  @Length(2, 200)
  name: string;
}

export class RequestChangesDto {
  @IsString()
  @Length(2, 2000)
  note: string;
}
