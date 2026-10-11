import {
  decideBulkSend,
  evaluateDeliveryHealth,
  isOptOutReply,
  localDayStart,
  nextSendWindowStart,
  warmupTier,
  BulkSendInput,
} from './send-safety.policy';

const DAY = 24 * 60 * 60 * 1000;
// 2026-10-12 10:30 IST (05:00 UTC)
const morningIst = new Date('2026-10-12T05:00:00.000Z');

function input(overrides: Partial<BulkSendInput> = {}): BulkSendInput {
  return {
    now: morningIst,
    timeZone: 'Asia/Kolkata',
    linkedAt: new Date(morningIst.getTime() - 60 * DAY),
    pausedUntil: null,
    pausedReason: null,
    bulkSentToday: 0,
    coldSentToday: 0,
    recipientIsCold: false,
    ...overrides,
  };
}

describe('warmupTier', () => {
  it('starts new numbers on the lowest caps', () => {
    expect(warmupTier(new Date(morningIst.getTime() - 2 * DAY), morningIst)).toEqual({ stage: 1, coldCap: 20, bulkCap: 50 });
  });

  it('treats an unknown link date as brand new', () => {
    expect(warmupTier(null, morningIst).stage).toBe(1);
  });

  it('reaches full caps after three weeks', () => {
    expect(warmupTier(new Date(morningIst.getTime() - 30 * DAY), morningIst)).toEqual({ stage: 4, coldCap: 200, bulkCap: 500 });
  });
});

describe('local time helpers', () => {
  it('finds the local day start in the org time zone', () => {
    // 2026-10-12 00:00 IST = 2026-10-11 18:30 UTC
    expect(localDayStart(morningIst, 'Asia/Kolkata').toISOString()).toBe('2026-10-11T18:30:00.000Z');
  });

  it('opens the next window at 9:00 local tomorrow when it is evening', () => {
    const eveningIst = new Date('2026-10-12T16:00:00.000Z'); // 21:30 IST
    expect(nextSendWindowStart(eveningIst, 'Asia/Kolkata').toISOString()).toBe('2026-10-13T03:30:00.000Z');
  });

  it('opens at 9:00 local across a daylight-saving change (New York, 2026-11-01)', () => {
    // Sat 2026-10-31 21:00 EDT (UTC-4); clocks fall back overnight, so Sunday 9:00 is EST (UTC-5)
    const saturdayEvening = new Date('2026-11-01T01:00:00.000Z');
    expect(nextSendWindowStart(saturdayEvening, 'America/New_York').toISOString()).toBe('2026-11-01T14:00:00.000Z');
  });

  it('finds midnight local on a daylight-saving change day', () => {
    // Sun 2026-11-01 10:00 EST; that day began at 00:00 EDT = 04:00 UTC
    const sundayMorning = new Date('2026-11-01T15:00:00.000Z');
    expect(localDayStart(sundayMorning, 'America/New_York').toISOString()).toBe('2026-11-01T04:00:00.000Z');
  });

  it('falls back to UTC for an unknown time zone', () => {
    expect(localDayStart(morningIst, 'Not/AZone').toISOString()).toBe('2026-10-12T00:00:00.000Z');
  });
});

describe('decideBulkSend', () => {
  it('allows a bulk message inside hours and under caps', () => {
    expect(decideBulkSend(input())).toEqual({ allowed: true });
  });

  it('holds while the number is paused', () => {
    const pausedUntil = new Date(morningIst.getTime() + 3600_000);
    expect(decideBulkSend(input({ pausedUntil, pausedReason: 'Low delivery' }))).toEqual({
      allowed: false,
      retryAt: pausedUntil,
      reason: 'Low delivery',
    });
  });

  it('holds outside sending hours', () => {
    const night = new Date('2026-10-12T17:00:00.000Z'); // 22:30 IST
    const decision = decideBulkSend(input({ now: night }));
    expect(decision.allowed).toBe(false);
  });

  it('holds once the daily bulk cap is reached', () => {
    const decision = decideBulkSend(input({ bulkSentToday: 500 }));
    expect(decision).toMatchObject({ allowed: false, reason: expect.stringContaining('Daily limit') });
  });

  it('caps cold recipients separately from warm ones', () => {
    expect(decideBulkSend(input({ coldSentToday: 200, recipientIsCold: false })).allowed).toBe(true);
    expect(decideBulkSend(input({ coldSentToday: 200, recipientIsCold: true })).allowed).toBe(false);
  });
});

describe('evaluateDeliveryHealth', () => {
  it('ignores small samples', () => {
    expect(evaluateDeliveryHealth({ bulkSent: 10, bulkDelivered: 0, optOuts: 0 }).healthy).toBe(true);
  });

  it('flags a low delivery rate', () => {
    expect(evaluateDeliveryHealth({ bulkSent: 40, bulkDelivered: 20, optOuts: 0 })).toMatchObject({ healthy: false, deliveryRate: 0.5 });
  });

  it('flags repeated opt-outs', () => {
    expect(evaluateDeliveryHealth({ bulkSent: 0, bulkDelivered: 0, optOuts: 3 }).healthy).toBe(false);
  });

  it('passes a healthy number', () => {
    expect(evaluateDeliveryHealth({ bulkSent: 40, bulkDelivered: 38, optOuts: 1 })).toEqual({ healthy: true, deliveryRate: 0.95 });
  });
});

describe('isOptOutReply', () => {
  it.each(['STOP', 'stop.', ' Unsubscribe ', 'Opt out'])('recognises %p', (body) => {
    expect(isOptOutReply(body)).toBe(true);
  });

  it.each(['please stop by tomorrow', 'ok', '', null])('ignores %p', (body) => {
    expect(isOptOutReply(body)).toBe(false);
  });
});
