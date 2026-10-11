import { Injectable } from '@nestjs/common';
import { SEND_SAFETY_CONFIG } from '@/common/constants';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Bulk "is this number on WhatsApp?" lookups are a classic ban trigger, so
 * lookups are cached and capped per WhatsApp number (per minute and per day).
 * In-memory is fine: there is a single backend instance.
 */
@Injectable()
export class WhatsAppCheckThrottleService {
  private readonly cache = new Map<string, { exists: boolean; checkedAt: number }>();
  private readonly lookups = new Map<string, number[]>();

  getCached(phone: string, now = Date.now()): boolean | undefined {
    const hit = this.cache.get(phone);
    if (!hit) return undefined;
    if (now - hit.checkedAt > SEND_SAFETY_CONFIG.WA_CHECK_CACHE_TTL_MS) {
      this.cache.delete(phone);
      return undefined;
    }
    return hit.exists;
  }

  remember(phone: string, exists: boolean, now = Date.now()): void {
    if (this.cache.size > 50_000) this.cache.clear();
    this.cache.set(phone, { exists, checkedAt: now });
  }

  /** Take one lookup slot for a session. Returns false when the minute or day cap is used up. */
  tryAcquire(sessionId: string, now = Date.now()): boolean {
    const recent = (this.lookups.get(sessionId) ?? []).filter((t) => now - t < DAY_MS);
    const lastMinute = recent.filter((t) => now - t < MINUTE_MS).length;

    if (
      lastMinute >= SEND_SAFETY_CONFIG.WA_CHECK_PER_MINUTE ||
      recent.length >= SEND_SAFETY_CONFIG.WA_CHECK_PER_DAY
    ) {
      this.lookups.set(sessionId, recent);
      return false;
    }

    recent.push(now);
    this.lookups.set(sessionId, recent);
    return true;
  }
}
