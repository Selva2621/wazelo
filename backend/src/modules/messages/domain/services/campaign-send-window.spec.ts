import { campaignSendWindow, readSendAnyTime } from './account-safety.service';
import { decideBulkSend } from './send-safety.policy';

describe('campaign send window', () => {
  // 02:00 in Asia/Kolkata (20:30 UTC the day before)
  const twoAmIst = new Date('2026-11-06T20:30:00.000Z');
  const base = {
    now: twoAmIst,
    timeZone: 'Asia/Kolkata',
    // Linked long ago: highest warm-up tier
    linkedAt: new Date('2026-01-01T00:00:00.000Z'),
    pausedUntil: null,
    pausedReason: null,
    bulkSentToday: 0,
    coldSentToday: 0,
    recipientIsCold: true,
  };

  it('reads the flag from campaign metadata', () => {
    expect(readSendAnyTime({ sendAnyTime: true })).toBe(true);
    expect(readSendAnyTime({ sendAnyTime: 'yes' })).toBe(false);
    expect(readSendAnyTime(null)).toBe(false);
    expect(readSendAnyTime([])).toBe(false);
  });

  it('a normal campaign waits outside 12 AM - 10 PM, a send-any-time one goes at night', () => {
    const elevenPm = new Date('2026-11-06T17:30:00.000Z'); // 23:00 IST
    expect(decideBulkSend({ ...base, now: elevenPm, sendWindow: campaignSendWindow(false) }).allowed).toBe(false);
    expect(decideBulkSend({ ...base, now: elevenPm, sendWindow: campaignSendWindow(true) }).allowed).toBe(true);
    expect(decideBulkSend({ ...base, sendWindow: campaignSendWindow(true) }).allowed).toBe(true);
  });

  it('still stops at the daily cold cap, and resumes the next day', () => {
    const decision = decideBulkSend({
      ...base,
      coldSentToday: 10_000,
      bulkSentToday: 10_000,
      sendWindow: campaignSendWindow(true),
    });
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.retryAt.getTime()).toBeGreaterThan(twoAmIst.getTime());
  });
});
