import { IsEnum, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ScrapeSource } from '@prisma/client';

export class TriggerScrapeDto {
  @IsEnum(ScrapeSource)
  source: ScrapeSource;

  @IsString()
  keywords: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  maxResults?: number;
}
