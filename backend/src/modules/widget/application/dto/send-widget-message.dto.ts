import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class SendWidgetMessageDto {
  @IsString()
  @MaxLength(64)
  visitorId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  visitorName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'visitorPhone must be a valid E.164 phone number',
  })
  visitorPhone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  visitorEmail?: string;

  @IsString()
  @MaxLength(4096)
  body: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  pageUrl?: string;
}
