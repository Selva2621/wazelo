import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { ChannelType } from '@prisma/client';

export class CreateChannelDto {
  @IsEnum(ChannelType)
  type: ChannelType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  /**
   * Provider-specific configuration object.
   * Validated at service layer based on channel type.
   *
   * WhatsApp: { phoneNumberId, accessToken, businessAccountId, webhookVerifyToken? }
   * Instagram: { pageId, accessToken, igUserId }
   * Facebook: { pageId, accessToken }
   * Email: { smtpHost, smtpPort, smtpUser, smtpPass, imapHost?, imapPort?, imapUser?, imapPass?, fromAddress, fromName? }
   */
  @IsObject()
  @IsNotEmpty()
  config: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  rateLimitPerMin?: number;
}
