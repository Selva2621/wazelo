import {
  GetLeadsTodayUseCase,
  GetRevenueSnapshotUseCase,
  GetWaitingChatsUseCase,
} from './get-live-dashboard.use-cases';
import { leadOrigin, summarizeRevenue, waitingMinutes } from '../../domain/services/dashboard-live';
import { buildCityInsights } from '../../domain/services/city-insights';

describe('live dashboard', () => {
  describe('summarizeRevenue', () => {
    it('defaults to INR with zeros when there are no deals', () => {
      expect(summarizeRevenue([], [])).toEqual({
        currency: 'INR',
        mixedCurrencies: false,
        pipelineValue: 0,
        openDeals: 0,
        wonCount: 0,
        wonValue: 0,
      });
    });

    it('sums only the most-used currency and flags the mix', () => {
      const out = summarizeRevenue(
        [
          { currency: 'INR', count: 5, value: 420000 },
          { currency: 'USD', count: 1, value: 900 },
        ],
        [{ currency: 'INR', count: 3, value: 80000 }],
      );
      expect(out).toEqual({
        currency: 'INR',
        mixedCurrencies: true,
        pipelineValue: 420000,
        openDeals: 5,
        wonCount: 3,
        wonValue: 80000,
      });
    });

    it('picks USD when most deals are in USD', () => {
      const out = summarizeRevenue([{ currency: 'USD', count: 4, value: 5000 }], [{ currency: 'INR', count: 1, value: 100 }]);
      expect(out.currency).toBe('USD');
      expect(out.wonValue).toBe(0);
    });
  });

  it('waitingMinutes floors and never goes negative', () => {
    const now = new Date('2026-11-17T10:00:00Z');
    expect(waitingMinutes(new Date('2026-11-17T09:28:30Z'), now)).toBe(31);
    expect(waitingMinutes(new Date('2026-11-17T10:05:00Z'), now)).toBe(0);
  });

  it('leadOrigin maps sources to plain words', () => {
    expect(leadOrigin('FACEBOOK_LEAD_AD')).toBe('Meta ad');
    expect(leadOrigin('INSTAGRAM_LEAD_AD')).toBe('Meta ad');
    expect(leadOrigin('WEBSITE')).toBe('Website');
    expect(leadOrigin('WEB_SCRAPE')).toBe('Lead finder');
    expect(leadOrigin('MANUAL')).toBe('Manual');
    expect(leadOrigin('SOMETHING_NEW')).toBe('Manual');
  });

  describe('buildCityInsights', () => {
    // India: local midnight 17 Nov = 16 Nov 18:30Z; rows carry local wall-clock hours
    const todayStart = new Date('2026-11-16T18:30:00Z');
    const now = new Date('2026-11-17T05:00:00Z'); // 10:30 IST
    const wall = (iso: string) => new Date(iso); // local wall-clock, as Postgres returns it

    it('buckets today and yesterday by local hour, null channel = WhatsApp', () => {
      const out = buildCityInsights({
        messages: [
          { channel: null, direction: 'INBOUND', localHour: wall('2026-11-17T10:00:00Z'), total: 4 },
          { channel: 'WHATSAPP', direction: 'OUTBOUND', localHour: wall('2026-11-17T10:00:00Z'), total: 2 },
          { channel: 'INSTAGRAM', direction: 'INBOUND', localHour: wall('2026-11-16T09:00:00Z'), total: 3 },
          { channel: 'INSTAGRAM', direction: 'INBOUND', localHour: wall('2026-11-16T15:00:00Z'), total: 7 },
        ],
        widget: [
          { sender: 'visitor', localHour: wall('2026-11-17T00:00:00Z'), total: 1 },
          { sender: 'system', localHour: wall('2026-11-17T00:00:00Z'), total: 9 },
        ],
        replies: [],
        todayStart,
        offsetMinutes: 330,
        now,
      });
      expect(out.currentHour).toBe(10);
      const wa = out.channels.find((c) => c.key === 'WHATSAPP')!;
      expect(wa.today[10]).toEqual({ in: 4, out: 2 });
      const ig = out.channels.find((c) => c.key === 'INSTAGRAM')!;
      expect(ig.yesterday[9].in).toBe(3);
      expect(out.channels.find((c) => c.key === 'WEBSITE')!.today[0]).toEqual({ in: 1, out: 0 });
      expect(out.totalToday).toBe(7);
      // Yesterday up to 10:59 only: the 15:00 messages don't count
      expect(out.totalYesterdaySameTime).toBe(3);
    });

    it('averages reply minutes, weighting by replies', () => {
      const out = buildCityInsights({
        messages: [],
        widget: [],
        replies: [
          { channel: null, avgMinutes: 10, replies: 1 },
          { channel: 'WHATSAPP', avgMinutes: 4, replies: 3 },
          { channel: 'INSTAGRAM', avgMinutes: 20, replies: 4 },
        ],
        todayStart,
        offsetMinutes: 330,
        now,
      });
      expect(out.channels.find((c) => c.key === 'WHATSAPP')).toMatchObject({ replyMinutes: 5.5, replies: 4 });
      expect(out.channels.find((c) => c.key === 'FACEBOOK_MESSENGER')!.replyMinutes).toBeNull();
      expect(out.replyMinutes).toBe(12.8); // (10 + 12 + 80) / 8 = 12.75
    });
  });

  describe('use-cases', () => {
    const now = new Date('2026-11-17T10:00:00.000Z');
    const scope = { resolveScope: jest.fn() };
    const repo = {
      getWaitingConversations: jest.fn(),
      getRevenueSnapshot: jest.fn(),
      getLeadsSince: jest.fn(),
    };
    beforeEach(() => jest.clearAllMocks());

    it('waiting: uses a 15-minute cutoff by default and names the assignee', async () => {
      scope.resolveScope.mockResolvedValue({ userIds: ['u-2'] });
      repo.getWaitingConversations.mockResolvedValue({
        total: 3,
        rows: [
          {
            conversationId: 'c1',
            contactId: null,
            contactName: null,
            contactPhone: '+919800000001',
            channelType: null,
            waitingSince: new Date('2026-11-17T09:20:00Z'),
            assignedToId: 'u-2',
            assigneeFirstName: 'Ravi',
            assigneeLastName: null,
          },
        ],
      });
      const uc = new GetWaitingChatsUseCase(repo as never, scope as never);
      const out = await uc.execute('org', 'EMPLOYEE', 'u-2', {}, now);
      expect(repo.getWaitingConversations).toHaveBeenCalledWith('org', new Date('2026-11-17T09:45:00Z'), ['u-2'], 6);
      expect(out).toMatchObject({ minMinutes: 15, total: 3 });
      expect(out.items[0]).toMatchObject({ channelType: 'WHATSAPP', waitingMinutes: 40, assignee: { id: 'u-2', name: 'Ravi' } });
    });

    it('revenue: looks back 7 days', async () => {
      scope.resolveScope.mockResolvedValue({ userIds: undefined });
      repo.getRevenueSnapshot.mockResolvedValue({ open: [], won: [], proposalsSent: 12, proposalsViewed: 7 });
      const uc = new GetRevenueSnapshotUseCase(repo as never, scope as never);
      const out = await uc.execute('org', 'ADMIN', 'u-1', now);
      expect(repo.getRevenueSnapshot).toHaveBeenCalledWith('org', new Date('2026-11-10T10:00:00Z'), undefined);
      expect(out).toMatchObject({ proposalsSent: 12, proposalsViewed: 7, currency: 'INR' });
    });

    it('leads: counts from local midnight and labels the source', async () => {
      scope.resolveScope.mockResolvedValue({ userIds: undefined });
      repo.getLeadsSince.mockResolvedValue({
        total: 2,
        rows: [{ id: 'k1', name: 'Rahul', phoneNumber: '+91', source: 'FACEBOOK_LEAD_AD', createdAt: now }],
      });
      const uc = new GetLeadsTodayUseCase(repo as never, scope as never);
      const out = await uc.execute('org', 'ADMIN', 'u-1', { timezoneOffsetMinutes: 330 }, now);
      expect(repo.getLeadsSince).toHaveBeenCalledWith('org', new Date('2026-11-16T18:30:00Z'), undefined, 8);
      expect(out.items[0]).toMatchObject({ name: 'Rahul', origin: 'Meta ad' });
    });
  });
});
