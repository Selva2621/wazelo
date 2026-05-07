import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class ChangeLeadStatusDto {
  @IsEnum(LeadStatus)
  status: LeadStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
