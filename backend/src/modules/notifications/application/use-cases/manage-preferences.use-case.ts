import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';
import { NotificationRepository } from '../../infrastructure/repositories/notification.repository';
import { UpdateNotificationPreferenceDto } from '../dto/update-notification-preference.dto';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';
import { NotificationPreferencesUpdatedEvent } from '@/events/event-bus';

/**
 * Returns default preference state for all notification types.
 * Types that are high-volume default to email-disabled.
 */
function getDefaultPreferences(): Array<{
  notificationType: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}> {
  const emailDisabledByDefault: NotificationType[] = [
    'MESSAGE_RECEIVED',
    'CONTACT_ASSIGNED',
    'CONTACT_REASSIGNED',
    'AUTOMATION_EXECUTED',
  ];

  return Object.values(NotificationType).map((type) => ({
    notificationType: type,
    inAppEnabled: true,
    emailEnabled: !emailDisabledByDefault.includes(type),
  }));
}

@Injectable()
export class ManagePreferencesUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getPreferences(orgId: string, userId: string) {
    const saved =
      await this.notificationRepository.findAllPreferences(userId, orgId);
    const defaults = getDefaultPreferences();

    // Merge: user-saved preferences override defaults
    const savedMap = new Map(
      saved.map((p) => [p.notificationType, p]),
    );

    return defaults.map((defaultPref) => {
      const userPref = savedMap.get(defaultPref.notificationType);
      if (userPref) {
        return {
          notificationType: userPref.notificationType,
          inAppEnabled: userPref.inAppEnabled,
          emailEnabled: userPref.emailEnabled,
          isCustomized: true,
        };
      }
      return {
        notificationType: defaultPref.notificationType,
        inAppEnabled: defaultPref.inAppEnabled,
        emailEnabled: defaultPref.emailEnabled,
        isCustomized: false,
      };
    });
  }

  async updatePreference(
    orgId: string,
    userId: string,
    dto: UpdateNotificationPreferenceDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const preference =
      await this.notificationRepository.upsertPreference(
        orgId,
        userId,
        dto.notificationType,
        dto.inAppEnabled,
        dto.emailEnabled,
      );

    await this.auditService.log({
      orgId,
      userId,
      action: 'NOTIFICATION_PREFERENCE_UPDATED',
      targetType: 'NotificationPreference',
      targetId: preference.id,
      metadata: {
        notificationType: dto.notificationType,
        inAppEnabled: dto.inAppEnabled,
        emailEnabled: dto.emailEnabled,
      },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.NOTIFICATION_PREFERENCES_UPDATED, {
      orgId,
      userId,
      notificationType: dto.notificationType,
      inAppEnabled: dto.inAppEnabled,
      emailEnabled: dto.emailEnabled,
    } satisfies NotificationPreferencesUpdatedEvent);

    return preference;
  }

  async bulkUpdatePreferences(
    orgId: string,
    userId: string,
    preferences: UpdateNotificationPreferenceDto[],
    ipAddress?: string,
    userAgent?: string,
  ) {
    const results = await Promise.all(
      preferences.map((dto) =>
        this.updatePreference(orgId, userId, dto, ipAddress, userAgent),
      ),
    );
    return results;
  }
}
