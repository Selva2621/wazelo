import { EventEmitter2 } from '@nestjs/event-emitter';
import { PhoneInactivityWorker } from './phone-inactivity.worker';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { EVENT_NAMES } from '@/common/constants';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('PhoneInactivityWorker', () => {
  const session = (id: string, daysAgo: number) => ({
    id,
    orgId: 'o1',
    userId: 'u1',
    phoneNumber: '+919876543210',
    lastPhoneActivityAt: new Date(Date.now() - daysAgo * DAY_MS - 1000),
  });

  it('warns at day 10 and sends the final warning from day 13', async () => {
    const repo = {
      findPhoneInactiveSessions: jest.fn().mockResolvedValue([session('a', 10), session('b', 13)]),
    } as unknown as WhatsAppSessionRepository;
    const emitter = { emit: jest.fn() } as unknown as EventEmitter2;

    await new PhoneInactivityWorker(repo, emitter).checkPhoneInactivity();

    const events = (emitter.emit as jest.Mock).mock.calls;
    expect(events).toHaveLength(2);
    expect(events[0][0]).toBe(EVENT_NAMES.WHATSAPP_PHONE_INACTIVE);
    expect(events[0][1]).toMatchObject({ sessionId: 'a', inactiveDays: 10, daysLeft: 4, final: false });
    expect(events[1][1]).toMatchObject({ sessionId: 'b', inactiveDays: 13, daysLeft: 1, final: true });
  });

  it('asks only for sessions quiet for at least 10 days', async () => {
    const repo = { findPhoneInactiveSessions: jest.fn().mockResolvedValue([]) } as unknown as WhatsAppSessionRepository;
    await new PhoneInactivityWorker(repo, { emit: jest.fn() } as unknown as EventEmitter2).checkPhoneInactivity();

    const before = (repo.findPhoneInactiveSessions as jest.Mock).mock.calls[0][0] as Date;
    expect(Math.round((Date.now() - before.getTime()) / DAY_MS)).toBe(10);
  });
});
