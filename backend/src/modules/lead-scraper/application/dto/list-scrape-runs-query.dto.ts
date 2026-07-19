import { IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ScrapeRunStatus, ScrapeSource } from '@prisma/client';

export class ListScrapeRunsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  skip?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  take?: number;

  @IsOptional()
  @IsEnum(ScrapeRunStatus)
  status?: ScrapeRunStatus;

  @IsOptional()
  @IsEnum(ScrapeSource)
  source?: ScrapeSource;
}
