import { IsUUID, IsArray, IsOptional } from 'class-validator';

export class ImportScrapeResultsDto {
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  resultIds?: string[];
}
