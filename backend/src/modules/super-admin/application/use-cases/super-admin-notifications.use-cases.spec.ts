import { NotFoundException } from '@nestjs/common';
import {
  ListSuperAdminNotificationsUseCase,
  MarkAllSuperAdminNotificationsReadUseCase,
  MarkSuperAdminNotificationReadUseCase,
} from './super-admin-notifications.use-cases';

function repo(exists = true) {
  return {
    findLatest: jest.fn().mockResolvedValue([]),
    countUnread: jest.fn().mockResolvedValue(3),
    exists: jest.fn().mockResolvedValue(exists),
    markRead: jest.fn(),
    markAllRead: jest.fn().mockResolvedValue(3),
  };
}

describe('super admin notifications', () => {
  it('lists the latest 50 for the current admin only', async () => {
    const r = repo();
    const out = await new ListSuperAdminNotificationsUseCase(r as any).execute('sa-1', true);
    expect(r.findLatest).toHaveBeenCalledWith('sa-1', true, 50);
    expect(r.countUnread).toHaveBeenCalledWith('sa-1');
    expect(out.unreadCount).toBe(3);
  });

  it("refuses to mark another admin's notification read", async () => {
    const r = repo(false);
    await expect(new MarkSuperAdminNotificationReadUseCase(r as any).execute('sa-1', 'n-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(r.markRead).not.toHaveBeenCalled();
  });

  it('marks its own notification read', async () => {
    const r = repo();
    await new MarkSuperAdminNotificationReadUseCase(r as any).execute('sa-1', 'n-1');
    expect(r.exists).toHaveBeenCalledWith('n-1', 'sa-1');
    expect(r.markRead).toHaveBeenCalledWith('n-1', 'sa-1');
  });

  it('marks all read for the current admin', async () => {
    const r = repo();
    expect(await new MarkAllSuperAdminNotificationsReadUseCase(r as any).execute('sa-1')).toEqual({ updated: 3 });
    expect(r.markAllRead).toHaveBeenCalledWith('sa-1');
  });
});
