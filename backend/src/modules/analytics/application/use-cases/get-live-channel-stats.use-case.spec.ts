import { GetLiveChannelStatsUseCase } from './get-live-channel-stats.use-case';
import {
  buildLiveChannelStats,
  startOfLocalDay,
} from '../../domain/services/live-channel-stats';

describe('live channel stats', () => {
  describe('startOfLocalDay', () => {
    it('uses UTC midnight with no offset', () => {
      const now = new Date('2026-11-17T15:30:00.000Z');
      expect(startOfLocalDay(now).toISOString()).toBe('2026-11-17T00:00:00.000Z');
    });

    it('rolls to the local day for a positive offset', () => {
      // 20:00 UTC = 01:00 next day at +5 → local today starts 2026-11-17T19:00Z
      const now = new Date('2026-11-17T20:00:00.000Z');
      expect(startOfLocalDay(now, 300).toISOString()).toBe('2026-11-17T19:00:00.000Z');
    });

    it('handles a negative offset', () => {
      const now = new Date('2026-11-17T03:00:00.000Z'); // 22:00 on the 16th at -5
      expect(startOfLocalDay(now, -300).toISOString()).toBe('2026-11-16T05:00:00.000Z');
    });

    it('is exact for half-hour zones (India, +5:30)', () => {
      // 05:00 UTC = 10:30 IST → IST midnight was 18:30 UTC the day before
      const now = new Date('2026-11-17T05:00:00.000Z');
      expect(startOfLocalDay(now, 330).toISOString()).toBe('2026-11-16T18:30:00.000Z');
      // 18:45 UTC = 00:15 IST the next day → that day's midnight, not the previous one
      const late = new Date('2026-11-17T18:45:00.000Z');
      expect(startOfLocalDay(late, 330).toISOString()).toBe('2026-11-17T18:30:00.000Z');
    });
  });

  describe('buildLiveChannelStats', () => {
    const t1 = new Date('2026-11-17T08:00:00.000Z');
    const t2 = new Date('2026-11-17T09:00:00.000Z');

    it('always returns all five channels in order', () => {
      const out = buildLiveChannelStats({ messages: [], widget: [], email: [] });
      expect(out.map((c) => c.key)).toEqual([
        'WHATSAPP',
        'INSTAGRAM',
        'FACEBOOK_MESSENGER',
        'WEBSITE',
        'EMAIL',
      ]);
      expect(out.every((c) => c.inbound === 0 && c.outbound === 0)).toBe(true);
    });

    it('counts null channel_type as WhatsApp and merges with WHATSAPP rows', () => {
      const out = buildLiveChannelStats({
        messages: [
          { channel: null, direction: 'INBOUND', total: 3, delivered: 0, read: 0, failed: 0, lastAt: t1 },
          { channel: 'WHATSAPP', direction: 'OUTBOUND', total: 2, delivered: 2, read: 1, failed: 0, lastAt: t2 },
          { channel: 'INSTAGRAM', direction: 'INBOUND', total: 4, delivered: 0, read: 0, failed: 0, lastAt: t1 },
        ],
        widget: [],
        email: [],
      });
      const wa = out.find((c) => c.key === 'WHATSAPP')!;
      expect(wa).toMatchObject({ inbound: 3, outbound: 2, delivered: 2, read: 1 });
      expect(wa.lastMessageAt).toBe(t2.toISOString());
      expect(out.find((c) => c.key === 'INSTAGRAM')!.inbound).toBe(4);
    });

    it('ignores unknown channel types', () => {
      const out = buildLiveChannelStats({
        messages: [{ channel: 'SMS', direction: 'INBOUND', total: 9, delivered: 0, read: 0, failed: 0, lastAt: t1 }],
        widget: [],
        email: [],
      });
      expect(out.reduce((s, c) => s + c.inbound, 0)).toBe(0);
    });

    it('maps widget senders: visitor in, agent/bot out, system skipped', () => {
      const out = buildLiveChannelStats({
        messages: [],
        widget: [
          { sender: 'visitor', total: 5, lastAt: t1 },
          { sender: 'agent', total: 2, lastAt: t1 },
          { sender: 'bot', total: 3, lastAt: t2 },
          { sender: 'system', total: 7, lastAt: new Date('2026-11-17T23:00:00.000Z') },
        ],
        email: [],
      });
      const web = out.find((c) => c.key === 'WEBSITE')!;
      expect(web).toMatchObject({ inbound: 5, outbound: 5 });
      expect(web.lastMessageAt).toBe(t2.toISOString());
    });

    it('counts emails as outbound, skipping SKIPPED', () => {
      const out = buildLiveChannelStats({
        messages: [],
        widget: [],
        email: [
          { status: 'SENT', total: 4, lastAt: t1 },
          { status: 'FAILED', total: 1, lastAt: t1 },
          { status: 'QUEUED', total: 2, lastAt: t1 },
          { status: 'SKIPPED', total: 10, lastAt: t2 },
        ],
      });
      const email = out.find((c) => c.key === 'EMAIL')!;
      expect(email).toMatchObject({ inbound: 0, outbound: 7, delivered: 4, failed: 1 });
      expect(email.lastMessageAt).toBe(t1.toISOString());
    });
  });

  describe('GetLiveChannelStatsUseCase', () => {
    const repo = {
      getLiveMessageCountsByChannel: jest.fn().mockResolvedValue([]),
      getLiveWidgetMessageCounts: jest.fn().mockResolvedValue([]),
      getLiveEmailCounts: jest.fn().mockResolvedValue([{ status: 'SENT', total: 2, lastAt: null }]),
      getInboxSummary: jest.fn().mockResolvedValue({ openConversations: 6, unread: 11 }),
    };
    const scope = { resolveScope: jest.fn() };
    const useCase = new GetLiveChannelStatsUseCase(repo as never, scope as never);
    const now = new Date('2026-11-17T12:00:00.000Z');

    beforeEach(() => jest.clearAllMocks());

    it('admin: org-wide, includes email', async () => {
      scope.resolveScope.mockResolvedValue({ userIds: undefined });
      const out = await useCase.execute('org-1', 'ADMIN', 'u-1', {}, now);
      expect(repo.getLiveEmailCounts).toHaveBeenCalledWith('org-1', new Date('2026-11-17T00:00:00.000Z'));
      expect(out.channels.find((c) => c.key === 'EMAIL')!.outbound).toBe(2);
      expect(out).toMatchObject({ openConversations: 6, unread: 11, since: '2026-11-17T00:00:00.000Z' });
    });

    it('employee: scoped to own id, no email', async () => {
      scope.resolveScope.mockResolvedValue({ userIds: ['u-2'] });
      const out = await useCase.execute('org-1', 'EMPLOYEE', 'u-2', { timezoneOffsetHours: 5 }, now);
      expect(repo.getLiveEmailCounts).not.toHaveBeenCalled();
      expect(repo.getLiveMessageCountsByChannel).toHaveBeenCalledWith(
        'org-1',
        new Date('2026-11-16T19:00:00.000Z'),
        ['u-2'],
      );
      expect(repo.getInboxSummary).toHaveBeenCalledWith('org-1', ['u-2']);
      expect(out.channels.find((c) => c.key === 'EMAIL')!.outbound).toBe(0);
    });

    it('prefers the exact minutes offset over whole hours', async () => {
      scope.resolveScope.mockResolvedValue({ userIds: undefined });
      const out = await useCase.execute(
        'org-1',
        'ADMIN',
        'u-1',
        { timezoneOffsetMinutes: 330, timezoneOffsetHours: 6 },
        now,
      );
      expect(out.since).toBe('2026-11-16T18:30:00.000Z');
    });
  });
});
