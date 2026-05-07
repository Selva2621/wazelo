import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationRepository } from '../../infrastructure/repositories/notification.repository';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { EVENT_NAMES } from '@/common/constants';
import { NotificationDeletedEvent } from '@/events/event-bus';

@Injectable()
export class DeleteNotificationsUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly wsGateway: AppWebSocketGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async deleteSelected(
    orgId: string,
    userId: string,
    notificationIds: string[],
  ): Promise<{ deletedCount: number; unreadCount: number }> {
    const deletedCount =
      await this.notificationRepository.deleteNotifications(
        notificationIds,
        userId,
        orgId,
      );

    const unreadCount =
      await this.notificationRepository.countUnread(userId, orgId);

    if (deletedCount > 0) {
      this.wsGateway.emitToUser(userId, 'notification:unread-count', {
        unreadCount,
      });

      for (const notificationId of notificationIds) {
        this.eventEmitter.emit(EVENT_NAMES.NOTIFICATION_DELETED, {
          notificationId,
          orgId,
          userId,
        } satisfies NotificationDeletedEvent);
      }
    }

    return { deletedCount, unreadCount };
  }

  async deleteAllRead(
    orgId: string,
    userId: string,
  ): Promise<{ deletedCount: number }> {
    const deletedCount =
      await this.notificationRepository.deleteAllRead(userId, orgId);
    return { deletedCount };
  }
}
