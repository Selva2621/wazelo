import { Injectable, NotFoundException } from '@nestjs/common';
import { SuperAdminNotificationRepository } from '../../infrastructure/repositories/super-admin-notification.repository';

const LATEST = 50;

/** The current super admin's latest 50 notifications plus their unread count. */
@Injectable()
export class ListSuperAdminNotificationsUseCase {
  constructor(private readonly repo: SuperAdminNotificationRepository) {}

  async execute(superAdminId: string, unreadOnly: boolean) {
    const [notifications, unreadCount] = await Promise.all([
      this.repo.findLatest(superAdminId, unreadOnly, LATEST),
      this.repo.countUnread(superAdminId),
    ]);
    return { notifications, unreadCount };
  }
}

@Injectable()
export class MarkSuperAdminNotificationReadUseCase {
  constructor(private readonly repo: SuperAdminNotificationRepository) {}

  /** Idempotent; 404 for another admin's (or a missing) notification. */
  async execute(superAdminId: string, id: string): Promise<{ success: true }> {
    if (!(await this.repo.exists(id, superAdminId))) throw new NotFoundException('Notification not found');
    await this.repo.markRead(id, superAdminId);
    return { success: true };
  }
}

@Injectable()
export class MarkAllSuperAdminNotificationsReadUseCase {
  constructor(private readonly repo: SuperAdminNotificationRepository) {}

  async execute(superAdminId: string) {
    return { updated: await this.repo.markAllRead(superAdminId) };
  }
}
