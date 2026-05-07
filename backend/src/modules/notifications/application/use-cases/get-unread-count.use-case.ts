import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../../infrastructure/repositories/notification.repository';

@Injectable()
export class GetUnreadCountUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    orgId: string,
    userId: string,
  ): Promise<{ unreadCount: number }> {
    const unreadCount =
      await this.notificationRepository.countUnread(userId, orgId);
    return { unreadCount };
  }
}
