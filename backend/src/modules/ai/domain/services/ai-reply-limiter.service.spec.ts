import { AiReplyLimiterService, AI_REPLY_LIMITS } from './ai-reply-limiter.service';

describe('AiReplyLimiterService', () => {
  const check = (limit: number, key = 'k') => ({ key, limit, windowMs: 1000 });

  it('allows up to the limit, then blocks until the window passes', () => {
    const l = new AiReplyLimiterService();
    expect(l.tryTake([check(2)], 0)).toEqual({ ok: true });
    expect(l.tryTake([check(2)], 10)).toEqual({ ok: true });
    expect(l.tryTake([check(2)], 20)).toEqual({ ok: false, key: 'k', firstBlock: true });
    expect(l.tryTake([check(2)], 30)).toEqual({ ok: false, key: 'k', firstBlock: false });
    expect(l.tryTake([check(2)], 1001)).toEqual({ ok: true });
  });

  it('counts nothing when any check is full', () => {
    const l = new AiReplyLimiterService();
    l.tryTake([check(1, 'ip')], 0);
    expect(l.tryTake([check(5, 'session'), check(1, 'ip')], 1)).toMatchObject({ ok: false, key: 'ip' });
    // The session wasn't charged for the refused reply: it still has all 5
    for (let i = 0; i < 5; i++) expect(l.tryTake([check(5, 'session')], 2 + i).ok).toBe(true);
    expect(l.tryTake([check(5, 'session')], 10).ok).toBe(false);
  });

  it('a new visitor id per message still hits the per-IP limit', () => {
    const l = new AiReplyLimiterService();
    const results = Array.from({ length: 45 }, (_, i) =>
      l.tryTake([AI_REPLY_LIMITS.widgetSession(`s${i}`), AI_REPLY_LIMITS.widgetIp('1.2.3.4')], i).ok,
    );
    expect(results.filter(Boolean)).toHaveLength(40);
  });
});
