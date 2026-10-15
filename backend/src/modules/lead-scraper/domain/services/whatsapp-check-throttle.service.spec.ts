import { WhatsAppCheckThrottleService } from './whatsapp-check-throttle.service';
import { SEND_SAFETY_CONFIG } from '@/common/constants';

describe('WhatsAppCheckThrottleService', () => {
  let throttle: WhatsAppCheckThrottleService;
  const now = 10_000_000;

  beforeEach(() => {
    throttle = new WhatsAppCheckThrottleService();
  });

  it('caps lookups per minute', () => {
    for (let i = 0; i < SEND_SAFETY_CONFIG.WA_CHECK_PER_MINUTE; i++) {
      expect(throttle.tryAcquire('s1', now)).toBe(true);
    }
    expect(throttle.tryAcquire('s1', now)).toBe(false);
    expect(throttle.tryAcquire('s1', now + 61_000)).toBe(true);
  });

  it('caps lookups per day', () => {
    let t = now;
    for (let i = 0; i < SEND_SAFETY_CONFIG.WA_CHECK_PER_DAY; i++) {
      expect(throttle.tryAcquire('s1', t)).toBe(true);
      t += 61_000;
    }
    expect(throttle.tryAcquire('s1', t)).toBe(false);
  });

  it('limits sessions independently', () => {
    for (let i = 0; i < SEND_SAFETY_CONFIG.WA_CHECK_PER_MINUTE; i++) throttle.tryAcquire('s1', now);
    expect(throttle.tryAcquire('s2', now)).toBe(true);
  });

  it('caches results until the TTL expires', () => {
    throttle.remember('+911234567890', true, now);
    expect(throttle.getCached('+911234567890', now + 1000)).toBe(true);
    expect(
      throttle.getCached('+911234567890', now + SEND_SAFETY_CONFIG.WA_CHECK_CACHE_TTL_MS + 1),
    ).toBeUndefined();
  });
});
