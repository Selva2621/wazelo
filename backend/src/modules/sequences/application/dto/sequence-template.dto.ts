import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateSequenceTemplateDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsEnum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'INTERACTIVE'])
  messageType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  messageBody?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mediaMimeType?: string;
}

export class UpdateSequenceTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsEnum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'INTERACTIVE'])
  messageType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  messageBody?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mediaMimeType?: string;
}
