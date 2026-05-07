import { IsEnum, IsBoolean } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class UpdateNotificationPreferenceDto {
  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @IsBoolean()
  inAppEnabled: boolean;

  @IsBoolean()
  emailEnabled: boolean;
}

export class BulkUpdateNotificationPreferencesDto {
  preferences: UpdateNotificationPreferenceDto[];
}
