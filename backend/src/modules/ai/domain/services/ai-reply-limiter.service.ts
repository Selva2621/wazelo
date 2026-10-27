import { Injectable } from '@nestjs/common';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export interface LimitCheck {
  key: string;
  limit: number;
  windowMs: number;
}

/**
 * How many automatic AI replies one source may trigger. Every reply costs the org
 * AI credits, and the website widget is public (its visitor id comes from the
 * browser), so these stop anyone from draining an org's credits.
 */
export const AI_REPLY_LIMITS = {
  /** One widget visitor session */
  widgetSession: (sessionId: string): LimitCheck => ({ key: `widget:session:${sessionId}`, limit: 20, windowMs: HOUR }),
  /** One IP address on the widget, across sessions (a new visitor id per message doesn't help) */
  widgetIp: (ip: string): LimitCheck => ({ key: `widget:ip:${ip}`, limit: 40, windowMs: HOUR }),
  /** All widget AI replies of one org */
  widgetOrg: (orgId: string): LimitCheck => ({ key: `widget:org:${orgId}`, limit: 300, windowMs: HOUR }),
  /** One WhatsApp conversation */
  chat: (conversationId: string): LimitCheck => ({ key: `chat:${conversationId}`, limit: 40, windowMs: DAY }),
};

export type LimitResult = { ok: true } | { ok: false; key: string; firstBlock: boolean };

const MAX_KEYS = 20_000;

/**
 * Sliding-window counters kept in memory. The backend runs as one instance, so
 * in-memory is enough; a restart only resets the windows (failing open).
 */
@Injectable()
export class AiReplyLimiterService {
  private readonly hits = new Map<string, number[]>();
  /** When we last reported a key as blocked, so a flood logs once per window */
  private readonly reported = new Map<string, number>();

  /**
   * Counts one reply against every check when all are under their limit.
   * Otherwise counts nothing and says which check is full.
   */
  tryTake(checks: LimitCheck[], now = Date.now()): LimitResult {
    for (const c of checks) {
      const recent = this.recent(c, now);
      if (recent.length >= c.limit) {
        const last = this.reported.get(c.key);
        const firstBlock = last === undefined || now - last >= c.windowMs;
        if (firstBlock) this.reported.set(c.key, now);
        return { ok: false, key: c.key, firstBlock };
      }
    }
    for (const c of checks) {
      const recent = this.recent(c, now);
      recent.push(now);
      this.hits.set(c.key, recent);
    }
    if (this.hits.size > MAX_KEYS) this.prune(now);
    return { ok: true };
  }

  private recent(c: LimitCheck, now: number): number[] {
    return (this.hits.get(c.key) ?? []).filter((t) => now - t < c.windowMs);
  }

  /** Drops keys with nothing in the last day */
  private prune(now: number): void {
    for (const [key, times] of this.hits) {
      if (!times.some((t) => now - t < DAY)) this.hits.delete(key);
    }
    for (const [key, at] of this.reported) {
      if (now - at >= DAY) this.reported.delete(key);
    }
  }
}
