import { Logger } from '@nestjs/common';
import { SuperAdminTicketNotifier } from './super-admin-ticket-notifier.service';

const ticket = { id: 't-1', title: 'Help', assignedToId: null, user: { firstName: 'Asha', lastName: 'K' } };

function setup(admins = [{ id: 'a1' }, { id: 'a2' }]) {
  const superAdminRepo = { findAll: jest.fn().mockResolvedValue(admins) };
  const notificationRepo = { createMany: jest.fn().mockResolvedValue(undefined) };
  const notifier = new SuperAdminTicketNotifier(superAdminRepo as any, notificationRepo as any);
  return { notifier, superAdminRepo, notificationRepo };
}

describe('SuperAdminTicketNotifier', () => {
  beforeAll(() => jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined));

  it('writes one inbox entry per enabled super admin for an unassigned ticket', async () => {
    const s = setup();
    await s.notifier.notify('created', ticket, 'It broke');
    const rows = s.notificationRepo.createMany.mock.calls[0][0];
    expect(rows.map((r: { superAdminId: string }) => r.superAdminId)).toEqual(['a1', 'a2']);
    expect(rows[0]).toMatchObject({ body: 'Asha K: It broke', link: '/super-admin/tickets/t-1' });
  });

  it('writes only to the assignee when assigned', async () => {
    const s = setup();
    await s.notifier.notify('customer_reply', { ...ticket, assignedToId: 'a2' }, 'Any news?');
    expect(s.notificationRepo.createMany.mock.calls[0][0]).toHaveLength(1);
    expect(s.notificationRepo.createMany.mock.calls[0][0][0].superAdminId).toBe('a2');
  });

  it('never throws, so the tenant request is unaffected', async () => {
    const s = setup();
    s.notificationRepo.createMany.mockRejectedValue(new Error('db down'));
    await expect(s.notifier.notify('created', ticket, 'x')).resolves.toBeUndefined();
  });
});
