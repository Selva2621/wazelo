import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class SaveLeadAdsConfigDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  metaAppSecret?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(255)
  webhookVerifyToken?: string;
}
