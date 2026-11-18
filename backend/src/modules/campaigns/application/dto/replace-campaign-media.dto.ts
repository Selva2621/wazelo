import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ReplaceCampaignMediaDto {
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  mediaUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mediaMimeType?: string;
}
