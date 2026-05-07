import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationRepository } from '../../infrastructure/repositories/notification.repository';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { EVENT_NAMES } from '@/common/constants';
import {
  NotificationReadEvent,
  NotificationAllReadEvent,
} from '@/events/event-bus';

@Injectable()
export class MarkNotificationsReadUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly wsGateway: AppWebSocketGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async markSelected(
    orgId: string,
    userId: string,
    notificationIds: string[],
  ): Promise<{ updatedCount: number; unreadCount: number }> {
    const updatedCount =
      await this.notificationRepository.markAsRead(
        notificationIds,
        userId,
        orgId,
      );

    if (updatedCount > 0) {
      const unreadCount =
        await this.notificationRepository.countUnread(userId, orgId);

      // Push updated unread count to client
      this.wsGateway.emitToUser(userId, 'notification:unread-count', {
        unreadCount,
      });

      for (const notificationId of notificationIds) {
        this.eventEmitter.emit(EVENT_NAMES.NOTIFICATION_READ, {
          notificationId,
          orgId,
          userId,
        } satisfies NotificationReadEvent);
      }

      return { updatedCount, unreadCount };
    }

    const unreadCount =
      await this.notificationRepository.countUnread(userId, orgId);
    return { updatedCount: 0, unreadCount };
  }

  async markAll(
    orgId: string,
    userId: string,
  ): Promise<{ updatedCount: number }> {
    const updatedCount =
      await this.notificationRepository.markAllAsRead(userId, orgId);

    if (updatedCount > 0) {
      this.wsGateway.emitToUser(userId, 'notification:unread-count', {
        unreadCount: 0,
      });

      this.eventEmitter.emit(EVENT_NAMES.NOTIFICATION_ALL_READ, {
        orgId,
        userId,
        count: updatedCount,
      } satisfies NotificationAllReadEvent);
    }

    return { updatedCount };
  }
}
