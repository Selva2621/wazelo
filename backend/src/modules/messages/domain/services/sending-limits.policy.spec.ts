import {
  bulkGapRange,
  decideBulkSend,
  localDayStart,
  nextCapResetAt,
  readSendingLimits,
  warmupTier,
  type SendingLimits,
} from './send-safety.policy';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-12T05:00:00.000Z'); // 10:30 IST
const newNumber = new Date(now.getTime() - 2 * DAY); // stage 1 by age

describe('per-number sending limits', () => {
  it('has no daily cap when nothing is set (the plan limit governs)', () => {
    expect(warmupTier(newNumber, now)).toEqual({ stage: 1, coldCap: null, bulkCap: null, mode: 'plan', customized: false });
  });

  it('applies the warm-up caps only when warm-up is turned on for the number', () => {
    expect(warmupTier(newNumber, now, { warmupEnabled: true })).toEqual({
      stage: 1, coldCap: 20, bulkCap: 50, mode: 'warmup', customized: false,
    });
  });

  it('lets an admin start an already-active number at a later warm-up stage', () => {
    expect(warmupTier(newNumber, now, { warmupEnabled: true, warmupStage: 4 })).toEqual({
      stage: 4, coldCap: 200, bulkCap: 500, mode: 'warmup', customized: true,
    });
  });

  it('applies a single custom cap without warm-up', () => {
    expect(warmupTier(newNumber, now, { dailyColdCap: 80 })).toMatchObject({ bulkCap: null, coldCap: 80, mode: 'custom' });
  });

  it('never moves an aged number back to an earlier stage', () => {
    const old = new Date(now.getTime() - 40 * DAY);
    expect(warmupTier(old, now, { warmupStage: 1 }).stage).toBe(4);
  });

  it('uses explicit daily caps and keeps new contacts within the bulk cap', () => {
    expect(warmupTier(newNumber, now, { dailyBulkCap: 300, dailyColdCap: 400 })).toMatchObject({
      bulkCap: 300, coldCap: 300, customized: true,
    });
  });

  it('drops stored values outside the allowed bounds', () => {
    expect(readSendingLimits({ warmupStage: 9, dailyBulkCap: 50_000, dailyColdCap: 150, bulkGapMinMs: 100, warmupEnabled: 'yes' }))
      .toEqual({ dailyColdCap: 150 });
    expect(readSendingLimits({ warmupEnabled: true })).toEqual({ warmupEnabled: true });
    expect(readSendingLimits(null)).toEqual({});
    expect(readSendingLimits('junk')).toEqual({});
  });

  it('uses a custom bulk gap, never inverted', () => {
    expect(bulkGapRange({})).toEqual({ min: 10_000, max: 40_000 });
    expect(bulkGapRange({ bulkGapMinMs: 30_000, bulkGapMaxMs: 15_000 })).toEqual({ min: 15_000, max: 30_000 });
  });

  it('names the number setting (not a warm-up stage) when a custom cap holds a message', () => {
    const d = decideBulkSend({
      now, timeZone: 'Asia/Kolkata', linkedAt: newNumber, pausedUntil: null, pausedReason: null,
      bulkSentToday: 0, coldSentToday: 30, recipientIsCold: true, limits: { dailyColdCap: 30, warmupEnabled: true },
      sendWindow: { startHour: 0, endHour: 22 },
    });
    expect(d).toMatchObject({ allowed: false, reason: 'Daily limit reached for new contacts (30, number setting)' });
  });
});

describe('cap reset across time zones', () => {
  const window = { startHour: 0, endHour: 22 };

  it('waits for the org midnight, not the campaign midnight, when the org is behind', () => {
    // Org in UTC, campaign in IST. 20:00 UTC = 01:30 IST: the campaign's day already
    // rolled, the org's has not. Counters reset at 00:00 UTC (05:30 IST, window open).
    const at = new Date('2026-10-12T20:00:00.000Z');
    expect(nextCapResetAt(at, 'Asia/Kolkata', 'UTC', window).toISOString()).toBe('2026-10-13T00:00:00.000Z');
  });

  it('moves the reset to the window opening when the window is closed at midnight', () => {
    const at = new Date('2026-10-12T16:00:00.000Z'); // 21:30 IST
    expect(nextCapResetAt(at, 'Asia/Kolkata', 'Asia/Kolkata', { startHour: 9, endHour: 20 }).toISOString())
      .toBe('2026-10-13T03:30:00.000Z'); // 09:00 IST
  });

  it('matches the old behaviour when campaign and org share a zone', () => {
    const at = new Date('2026-10-12T17:00:00.000Z'); // 22:30 IST
    expect(nextCapResetAt(at, 'Asia/Kolkata', 'Asia/Kolkata', window).toISOString())
      .toBe('2026-10-12T18:30:00.000Z'); // 00:00 IST
  });
});

/**
 * Drives the real policy the way SendMessageWorker does for one number: each
 * recipient is checked, sent if allowed, otherwise held until `retryAt`. Counters
 * are recomputed per org-local day, like countBulkSentSince / countColdBulkSentSince.
 */
function simulateCampaign(opts: {
  recipients: number;
  /** Every Nth recipient has never messaged the org */
  coldEvery: number;
  linkedAt: Date;
  start: Date;
  limits?: SendingLimits;
  orgTimeZone: string;
  campaignTimeZone: string;
}) {
  const sentAt: Date[] = [];
  const coldSentAt: Date[] = [];
  const sentRecipients = new Set<number>();
  let clock = opts.start;
  let holds = 0;
  const gapMs = 25_000;

  for (let i = 0; i < opts.recipients; i++) {
    const cold = i % opts.coldEvery === 0;
    for (let attempt = 0; ; attempt++) {
      if (attempt > 400) throw new Error(`recipient ${i} stuck`);
      const dayStart = localDayStart(clock, opts.orgTimeZone);
      const decision = decideBulkSend({
        now: clock,
        timeZone: opts.campaignTimeZone,
        budgetTimeZone: opts.orgTimeZone,
        linkedAt: opts.linkedAt,
        pausedUntil: null,
        pausedReason: null,
        bulkSentToday: sentAt.filter((t) => t >= dayStart).length,
        coldSentToday: coldSentAt.filter((t) => t >= dayStart).length,
        recipientIsCold: cold,
        limits: opts.limits,
        sendWindow: { startHour: 0, endHour: 22 },
      });
      if (decision.allowed) {
        if (sentRecipients.has(i)) throw new Error(`recipient ${i} sent twice`);
        sentRecipients.add(i);
        sentAt.push(clock);
        if (cold) coldSentAt.push(clock);
        clock = new Date(clock.getTime() + gapMs);
        break;
      }
      holds++;
      expect(decision.retryAt.getTime()).toBeGreaterThan(clock.getTime());
      clock = decision.retryAt;
    }
  }
  const perDay = new Map<string, number>();
  for (const t of coldSentAt) {
    const k = localDayStart(t, opts.orgTimeZone).toISOString();
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const days = new Set(sentAt.map((t) => localDayStart(t, opts.orgTimeZone).toISOString())).size;
  return { sent: sentRecipients.size, holds, days, coldPerDay: [...perDay.values()] };
}

describe('300+ recipient campaign on one number', () => {
  const start = new Date('2026-10-12T04:30:00.000Z'); // 10:00 IST

  it('sends all 300 on a brand-new number in one go by default — no hidden cap at 20', () => {
    const r = simulateCampaign({
      recipients: 300, coldEvery: 1, linkedAt: start, start,
      orgTimeZone: 'Asia/Kolkata', campaignTimeZone: 'Asia/Kolkata',
    });
    expect(r.sent).toBe(300);
    expect(r.holds).toBe(0);
    expect(r.days).toBe(1);
  });

  it('sends 1,000 new contacts without a daily hold by default', () => {
    const r = simulateCampaign({
      recipients: 1_000, coldEvery: 1, linkedAt: start, start,
      orgTimeZone: 'UTC', campaignTimeZone: 'Asia/Kolkata',
    });
    expect(r.sent).toBe(1_000);
    expect(r.holds).toBe(0);
  });

  it('with warm-up turned on: all 300 exactly once, never over the day’s cap', () => {
    const r = simulateCampaign({
      recipients: 300, coldEvery: 1, linkedAt: start, start, limits: { warmupEnabled: true },
      orgTimeZone: 'Asia/Kolkata', campaignTimeZone: 'Asia/Kolkata',
    });
    expect(r.sent).toBe(300);
    // Days 1–7: 20/day (140); from day 8: 50/day → 300 done on day 11
    expect(r.coldPerDay.slice(0, 7)).toEqual([20, 20, 20, 20, 20, 20, 20]);
    expect(Math.max(...r.coldPerDay)).toBeLessThanOrEqual(50);
    expect(r.days).toBe(11);
  });

  it('with warm-up on at stage 4: 300 in two days', () => {
    const r = simulateCampaign({
      recipients: 300, coldEvery: 1, linkedAt: start, start, limits: { warmupEnabled: true, warmupStage: 4 },
      orgTimeZone: 'Asia/Kolkata', campaignTimeZone: 'Asia/Kolkata',
    });
    expect(r.sent).toBe(300);
    expect(r.coldPerDay).toEqual([200, 100]);
  });

  it('finishes 300 in one day with a 300/day cap — no hidden limit at 20', () => {
    const r = simulateCampaign({
      recipients: 300, coldEvery: 1, linkedAt: start, start,
      limits: { dailyBulkCap: 300, dailyColdCap: 300 },
      orgTimeZone: 'Asia/Kolkata', campaignTimeZone: 'Asia/Kolkata',
    });
    expect(r.sent).toBe(300);
    expect(r.holds).toBe(0);
    expect(r.days).toBe(1);
  });

  it('with warm-up on: 1,000 across days when the campaign zone differs from the org zone', () => {
    const r = simulateCampaign({
      recipients: 1_000, coldEvery: 2, linkedAt: new Date(start.getTime() - 60 * DAY), start,
      limits: { warmupEnabled: true },
      orgTimeZone: 'UTC', campaignTimeZone: 'Asia/Kolkata',
    });
    expect(r.sent).toBe(1_000);
    // Stage 4: 500 bulk / 200 new contacts per day. Half are new contacts, so the
    // 200 cap binds first: 400 + 400 + 200 over three org days, never above a cap.
    expect(r.coldPerDay).toEqual([200, 200, 100]);
    expect(r.days).toBe(3);
  });
});
