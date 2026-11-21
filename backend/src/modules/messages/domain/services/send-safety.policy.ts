import { SEND_SAFETY_CONFIG, SENDING_LIMIT_BOUNDS } from '@/common/constants';

/**
 * Pure send-safety rules for bulk messages (campaigns, sequences) on a
 * Baileys number. No I/O — AccountSafetyService feeds in the counts.
 */

export interface DailyCaps {
  /** Cold messages (to people who never wrote first) allowed per day; null = no daily cap */
  coldCap: number | null;
  /** All bulk messages allowed per day; null = no daily cap (only the plan's message limit) */
  bulkCap: number | null;
  /**
   * What decides daily volume on this number:
   * - plan:   no daily cap; the org's plan message limit is the only volume limit (default)
   * - custom: admin-set daily caps
   */
  mode: 'plan' | 'custom';
}

/**
 * Per-number sending limits set by an admin (whatsapp_sessions.sending_limits).
 * Every field is optional. With nothing set there is no daily cap: volume is
 * limited only by the org's plan (monthly message limit).
 */
export interface SendingLimits {
  /** Bulk messages per day on this number */
  dailyBulkCap?: number;
  /** Of those, messages to people who never messaged first */
  dailyColdCap?: number;
  /** Random gap between two bulk messages on this number */
  bulkGapMinMs?: number;
  bulkGapMaxMs?: number;
}

const intIn = (value: unknown, min: number, max: number): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : undefined;

/** Parse the stored JSON, dropping anything out of bounds (never trust a DB blob blindly). */
export function readSendingLimits(raw: unknown): SendingLimits {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  // Older rows may still hold warm-up fields (warmupEnabled, warmupStage): ignored
  const limits: SendingLimits = {
    dailyBulkCap: intIn(r.dailyBulkCap, 0, SENDING_LIMIT_BOUNDS.DAILY_BULK_MAX),
    dailyColdCap: intIn(r.dailyColdCap, 0, SENDING_LIMIT_BOUNDS.DAILY_COLD_MAX),
    bulkGapMinMs: intIn(r.bulkGapMinMs, SENDING_LIMIT_BOUNDS.BULK_GAP_MIN_MS, SENDING_LIMIT_BOUNDS.BULK_GAP_MAX_MS),
    bulkGapMaxMs: intIn(r.bulkGapMaxMs, SENDING_LIMIT_BOUNDS.BULK_GAP_MIN_MS, SENDING_LIMIT_BOUNDS.BULK_GAP_MAX_MS),
  };
  for (const key of Object.keys(limits) as (keyof SendingLimits)[]) {
    if (limits[key] === undefined) delete limits[key];
  }
  return limits;
}

/** Daily caps on a number: only what an admin set; otherwise none (plan limit only). */
export function dailyCaps(limits: SendingLimits = {}): DailyCaps {
  const bulkCap = limits.dailyBulkCap ?? null;
  const rawCold = limits.dailyColdCap ?? null;
  // New-contact messages are a subset of bulk messages
  const coldCap = rawCold === null ? null : bulkCap === null ? rawCold : Math.min(rawCold, bulkCap);
  return { coldCap, bulkCap, mode: bulkCap !== null || coldCap !== null ? 'custom' : 'plan' };
}

/** Random-gap bounds between bulk sends for a number (custom or default). */
export function bulkGapRange(limits: SendingLimits = {}): { min: number; max: number } {
  const min = limits.bulkGapMinMs ?? SEND_SAFETY_CONFIG.BULK_GAP_MIN_MS;
  const max = limits.bulkGapMaxMs ?? SEND_SAFETY_CONFIG.BULK_GAP_MAX_MS;
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

export interface LocalClock {
  hour: number;
  minute: number;
  second: number;
}

export interface SendWindow {
  startHour: number;
  endHour: number;
}

/** Wall-clock time in an IANA time zone (falls back to UTC for an unknown zone). */
export function localClock(now: Date, timeZone: string): LocalClock {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    return { hour: now.getUTCHours(), minute: now.getUTCMinutes(), second: now.getUTCSeconds() };
  }
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { hour: get('hour'), minute: get('minute'), second: get('second') };
}

/**
 * The arithmetic above uses the UTC offset in force *now*; on a daylight-saving
 * change day the target instant has a different offset. Nudge the instant until
 * its local clock reads the intended hour:minute (at most a couple of hours).
 */
function alignToLocalTime(candidate: Date, timeZone: string, hour: number, minute: number): Date {
  const local = localClock(candidate, timeZone);
  let diffMinutes = hour * 60 + minute - (local.hour * 60 + local.minute);
  // Wrap to the nearest direction (offset changes are at most a few hours)
  if (diffMinutes > 12 * 60) diffMinutes -= 24 * 60;
  if (diffMinutes < -12 * 60) diffMinutes += 24 * 60;
  return new Date(candidate.getTime() + diffMinutes * 60 * 1000);
}

/** Start of the local day (org time zone) as a UTC instant. */
export function localDayStart(now: Date, timeZone: string): Date {
  const { hour, minute, second } = localClock(now, timeZone);
  const naive = new Date(now.getTime() - ((hour * 60 + minute) * 60 + second) * 1000 - now.getMilliseconds());
  const aligned = alignToLocalTime(naive, timeZone, 0, 0);
  // Never step into the next day (a zone that skips midnight keeps the naive value)
  return aligned.getTime() <= now.getTime() ? aligned : naive;
}

/** Next time bulk sending opens (start hour, local), from now. */
export function nextSendWindowStart(
  now: Date,
  timeZone: string,
  startHour: number = SEND_SAFETY_CONFIG.BULK_SEND_START_HOUR,
): Date {
  const { hour, minute, second } = localClock(now, timeZone);
  const secondsIntoDay = (hour * 60 + minute) * 60 + second;
  let secondsUntil = startHour * 3600 - secondsIntoDay;
  if (secondsUntil <= 0) secondsUntil += 24 * 3600;
  const aligned = alignToLocalTime(new Date(now.getTime() + secondsUntil * 1000), timeZone, startHour, 0);
  return aligned.getTime() > now.getTime() ? aligned : new Date(now.getTime() + secondsUntil * 1000);
}

export function isWithinSendWindow(
  now: Date,
  timeZone: string,
  window: SendWindow = {
    startHour: SEND_SAFETY_CONFIG.BULK_SEND_START_HOUR,
    endHour: SEND_SAFETY_CONFIG.BULK_SEND_END_HOUR,
  },
): boolean {
  const { hour } = localClock(now, timeZone);
  return hour >= window.startHour && hour < window.endHour;
}

export interface BulkSendInput {
  now: Date;
  timeZone: string;
  pausedUntil: Date | null;
  pausedReason: string | null;
  /** Bulk messages sent today (local day) on this number */
  bulkSentToday: number;
  /** Cold bulk messages sent today on this number */
  coldSentToday: number;
  /** Has this recipient never messaged the org? */
  recipientIsCold: boolean;
  /** Optional feature-specific window; otherwise use the shared bulk window. */
  sendWindow?: SendWindow;
  /**
   * Time zone whose midnight resets the daily counters (the org's). Defaults to
   * `timeZone`. A campaign in another zone sends in its own window but shares the
   * number's daily budget, so a capped message must wait for *this* midnight.
   */
  budgetTimeZone?: string;
  /** Admin-set limits for this number */
  limits?: SendingLimits;
}

/**
 * When a message held by a daily cap can try again: the next reset of the
 * counters (budget-zone midnight), moved to the opening of the sending window
 * if the window is closed at that moment.
 */
export function nextCapResetAt(now: Date, timeZone: string, budgetTimeZone: string, window: SendWindow): Date {
  const reset = nextSendWindowStart(now, budgetTimeZone, 0);
  if (isWithinSendWindow(reset, timeZone, window)) return reset;
  return nextSendWindowStart(reset, timeZone, window.startHour);
}

export type BulkSendDecision =
  | { allowed: true }
  | { allowed: false; retryAt: Date; reason: string };

export function decideBulkSend(input: BulkSendInput): BulkSendDecision {
  const { now, timeZone } = input;
  const sendWindow = input.sendWindow ?? {
    startHour: SEND_SAFETY_CONFIG.BULK_SEND_START_HOUR,
    endHour: SEND_SAFETY_CONFIG.BULK_SEND_END_HOUR,
  };

  if (input.pausedUntil && input.pausedUntil > now) {
    return {
      allowed: false,
      retryAt: input.pausedUntil,
      reason: input.pausedReason ?? 'Bulk sending paused for this number',
    };
  }

  if (!isWithinSendWindow(now, timeZone, sendWindow)) {
    return {
      allowed: false,
      retryAt: nextSendWindowStart(now, timeZone, sendWindow.startHour),
      reason: 'Outside sending hours',
    };
  }

  const caps = dailyCaps(input.limits);
  const capResetAt = () => nextCapResetAt(now, timeZone, input.budgetTimeZone ?? timeZone, sendWindow);
  if (caps.bulkCap !== null && input.bulkSentToday >= caps.bulkCap) {
    return {
      allowed: false,
      retryAt: capResetAt(),
      reason: `Daily limit reached (${caps.bulkCap} bulk messages, number setting)`,
    };
  }
  if (input.recipientIsCold && caps.coldCap !== null && input.coldSentToday >= caps.coldCap) {
    return {
      allowed: false,
      retryAt: capResetAt(),
      reason: `Daily limit reached for new contacts (${caps.coldCap}, number setting)`,
    };
  }

  return { allowed: true };
}

export interface DeliveryHealthInput {
  /** Bulk messages sent between 24h and 1h ago */
  bulkSent: number;
  /** …of which reached the recipient's phone */
  bulkDelivered: number;
  /** Opt-out replies in the last 24h */
  optOuts: number;
}

export type HealthVerdict =
  | { healthy: true; deliveryRate: number | null }
  | { healthy: false; deliveryRate: number | null; reason: string };

export function evaluateDeliveryHealth(input: DeliveryHealthInput): HealthVerdict {
  const deliveryRate = input.bulkSent > 0 ? input.bulkDelivered / input.bulkSent : null;

  if (input.optOuts >= SEND_SAFETY_CONFIG.HEALTH_MAX_OPT_OUTS_24H) {
    return {
      healthy: false,
      deliveryRate,
      reason: `${input.optOuts} people asked to stop messages in the last 24 hours`,
    };
  }

  if (
    input.bulkSent >= SEND_SAFETY_CONFIG.HEALTH_MIN_SAMPLE &&
    deliveryRate !== null &&
    deliveryRate < SEND_SAFETY_CONFIG.HEALTH_MIN_DELIVERY_RATE
  ) {
    return {
      healthy: false,
      deliveryRate,
      reason: `Only ${Math.round(deliveryRate * 100)}% of recent bulk messages were delivered`,
    };
  }

  return { healthy: true, deliveryRate };
}

export function isOptOutReply(body: string | null | undefined): boolean {
  if (!body) return false;
  const normalized = body.trim().toLowerCase().replace(/[.!]+$/, '');
  return (SEND_SAFETY_CONFIG.OPT_OUT_KEYWORDS as readonly string[]).includes(normalized);
}
