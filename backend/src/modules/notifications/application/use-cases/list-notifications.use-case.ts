import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../../infrastructure/repositories/notification.repository';
import { ListNotificationsDto } from '../dto/list-notifications.dto';
import { NOTIFICATION_CONFIG } from '@/common/constants';

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(orgId: string, userId: string, dto: ListNotificationsDto) {
    const { notifications, total } =
      await this.notificationRepository.list({
        userId,
        orgId,
        type: dto.type,
        priority: dto.priority,
        isRead: dto.isRead,
        limit: dto.limit ?? NOTIFICATION_CONFIG.DEFAULT_PAGE_SIZE,
        offset: dto.offset ?? 0,
      });

    const unreadCount =
      await this.notificationRepository.countUnread(userId, orgId);

    return {
      notifications,
      total,
      unreadCount,
      limit: dto.limit ?? NOTIFICATION_CONFIG.DEFAULT_PAGE_SIZE,
      offset: dto.offset ?? 0,
    };
  }
}
