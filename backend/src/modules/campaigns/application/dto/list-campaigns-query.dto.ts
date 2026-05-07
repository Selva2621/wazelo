import { IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignStatus, CampaignRecipientStatus } from '@prisma/client';

export class ListCampaignsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'scheduledAt'])
  sortBy?: 'createdAt' | 'updatedAt' | 'scheduledAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class ListRecipientsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsEnum(CampaignRecipientStatus)
  status?: CampaignRecipientStatus;
}
