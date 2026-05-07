import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateWidgetConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEnum(['bottom-right', 'bottom-left', 'bottom-center'], {
    message: 'position must be bottom-right, bottom-left, or bottom-center',
  })
  position?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{3,6}$/, {
    message: 'primaryColor must be a valid hex color (e.g. #6366f1)',
  })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  welcomeMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  placeholder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'whatsappNumber must be a valid E.164 phone number',
  })
  whatsappNumber?: string | null;

  @IsOptional()
  @IsBoolean()
  preChatFormEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  aiAssistantEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  aiSystemPrompt?: string | null;
}
