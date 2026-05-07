import {
  NotificationType,
  NotificationPriority,
} from '@prisma/client';

/**
 * Value object representing the target and content of a notification
 * to be dispatched. Used by NotificationDispatchService to create
 * notifications across channels.
 */
export interface NotificationTarget {
  orgId: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  groupKey?: string;
  idempotencyKey?: string;
}
