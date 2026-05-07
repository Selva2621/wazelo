import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from '@prisma/client';

export interface NotificationEntity {
  id: string;
  orgId: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: Date | null;
  channel: NotificationChannel;
  groupKey: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
}

export interface NotificationPreferenceEntity {
  id: string;
  orgId: string;
  userId: string;
  notificationType: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  updatedAt: Date;
}
