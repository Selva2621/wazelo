import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  Notification,
  NotificationPreference,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  Prisma,
} from '@prisma/client';
import { NOTIFICATION_CONFIG } from '@/common/constants';

export interface CreateNotificationInput {
  orgId: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  channel: NotificationChannel;
  groupKey: string | null;
  idempotencyKey: string | null;
}

export interface ListNotificationsParams {
  userId: string;
  orgId: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  isRead?: boolean;
  limit: number;
  offset: number;
}

@Injectable()
export class NotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        orgId: input.orgId,
        userId: input.userId,
        type: input.type,
        priority: input.priority,
        title: input.title,
        body: input.body,
        data: input.data as Prisma.InputJsonValue ?? Prisma.JsonNull,
        channel: input.channel,
        groupKey: input.groupKey,
        idempotencyKey: input.idempotencyKey,
      },
    });
  }

  async findById(
    id: string,
    userId: string,
    orgId: string,
  ): Promise<Notification | null> {
    return this.prisma.notification.findFirst({
      where: { id, userId, orgId },
    });
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { idempotencyKey },
    });
  }

  async list(
    params: ListNotificationsParams,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const where: Prisma.NotificationWhereInput = {
      userId: params.userId,
      orgId: params.orgId,
    };

    if (params.type !== undefined) {
      where.type = params.type;
    }
    if (params.priority !== undefined) {
      where.priority = params.priority;
    }
    if (params.isRead !== undefined) {
      where.isRead = params.isRead;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  async countUnread(userId: string, orgId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, orgId, isRead: false },
    });
  }

  async markAsRead(
    notificationIds: string[],
    userId: string,
    orgId: string,
  ): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
        orgId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return result.count;
  }

  async markAllAsRead(userId: string, orgId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        orgId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return result.count;
  }

  async deleteNotifications(
    notificationIds: string[],
    userId: string,
    orgId: string,
  ): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        id: { in: notificationIds },
        userId,
        orgId,
      },
    });
    return result.count;
  }

  async deleteAllRead(userId: string, orgId: string): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
        orgId,
        isRead: true,
      },
    });
    return result.count;
  }

  /**
   * Trim notifications exceeding the per-user limit (keep newest).
   * Uses a subquery to find IDs to delete for efficiency.
   */
  async trimOldNotifications(
    userId: string,
    maxCount: number,
  ): Promise<number> {
    const count = await this.prisma.notification.count({
      where: { userId },
    });

    if (count <= maxCount) return 0;

    const excess = count - maxCount;

    // Find the oldest excess notifications
    const toDelete = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: excess,
      select: { id: true },
    });

    if (toDelete.length === 0) return 0;

    const result = await this.prisma.notification.deleteMany({
      where: {
        id: { in: toDelete.map((n) => n.id) },
      },
    });

    this.logger.debug(
      `Trimmed ${result.count} old notifications for user=${userId}`,
    );
    return result.count;
  }

  // ─── Preferences ───

  async findPreference(
    userId: string,
    notificationType: NotificationType,
  ): Promise<NotificationPreference | null> {
    return this.prisma.notificationPreference.findUnique({
      where: {
        unique_user_notification_pref: {
          userId,
          notificationType,
        },
      },
    });
  }

  async findAllPreferences(
    userId: string,
    orgId: string,
  ): Promise<NotificationPreference[]> {
    return this.prisma.notificationPreference.findMany({
      where: { userId, orgId },
    });
  }

  async upsertPreference(
    orgId: string,
    userId: string,
    notificationType: NotificationType,
    inAppEnabled: boolean,
    emailEnabled: boolean,
  ): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.upsert({
      where: {
        unique_user_notification_pref: {
          userId,
          notificationType,
        },
      },
      update: {
        inAppEnabled,
        emailEnabled,
      },
      create: {
        orgId,
        userId,
        notificationType,
        inAppEnabled,
        emailEnabled,
      },
    });
  }

  /**
   * Cleanup old notifications beyond retention period.
   * Called by a scheduled worker.
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        isRead: true,
      },
    });
    return result.count;
  }
}
