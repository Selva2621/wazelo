import { SEND_SAFETY_CONFIG } from '@/common/constants';

/**
 * Pure send-safety rules for bulk messages (campaigns, sequences) on a
 * Baileys number. No I/O — AccountSafetyService feeds in the counts.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface WarmupTier {
  stage: number;
  /** Cold messages (to people who never wrote first) allowed per day */
  coldCap: number;
  /** All bulk messages allowed per day */
  bulkCap: number;
}

export function warmupTier(linkedAt: Date | null, now: Date): WarmupTier {
  const ageDays = linkedAt ? (now.getTime() - linkedAt.getTime()) / DAY_MS : 0;
  const index = SEND_SAFETY_CONFIG.WARMUP_TIERS.findIndex((t) => ageDays < t.maxAgeDays);
  const tier = SEND_SAFETY_CONFIG.WARMUP_TIERS[index];
  return { stage: index + 1, coldCap: tier.cold, bulkCap: tier.bulk };
}

export interface LocalClock {
  hour: number;
  minute: number;
  second: number;
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
export function nextSendWindowStart(now: Date, timeZone: string): Date {
  const { hour, minute, second } = localClock(now, timeZone);
  const start = SEND_SAFETY_CONFIG.BULK_SEND_START_HOUR;
  const secondsIntoDay = (hour * 60 + minute) * 60 + second;
  let secondsUntil = start * 3600 - secondsIntoDay;
  if (secondsUntil <= 0) secondsUntil += 24 * 3600;
  const aligned = alignToLocalTime(new Date(now.getTime() + secondsUntil * 1000), timeZone, start, 0);
  return aligned.getTime() > now.getTime() ? aligned : new Date(now.getTime() + secondsUntil * 1000);
}

export function isWithinSendWindow(now: Date, timeZone: string): boolean {
  const { hour } = localClock(now, timeZone);
  return hour >= SEND_SAFETY_CONFIG.BULK_SEND_START_HOUR && hour < SEND_SAFETY_CONFIG.BULK_SEND_END_HOUR;
}

export interface BulkSendInput {
  now: Date;
  timeZone: string;
  linkedAt: Date | null;
  pausedUntil: Date | null;
  pausedReason: string | null;
  /** Bulk messages sent today (local day) on this number */
  bulkSentToday: number;
  /** Cold bulk messages sent today on this number */
  coldSentToday: number;
  /** Has this recipient never messaged the org? */
  recipientIsCold: boolean;
}

export type BulkSendDecision =
  | { allowed: true }
  | { allowed: false; retryAt: Date; reason: string };

export function decideBulkSend(input: BulkSendInput): BulkSendDecision {
  const { now, timeZone } = input;

  if (input.pausedUntil && input.pausedUntil > now) {
    return {
      allowed: false,
      retryAt: input.pausedUntil,
      reason: input.pausedReason ?? 'Bulk sending paused for this number',
    };
  }

  if (!isWithinSendWindow(now, timeZone)) {
    return { allowed: false, retryAt: nextSendWindowStart(now, timeZone), reason: 'Outside sending hours' };
  }

  const tier = warmupTier(input.linkedAt, now);
  if (input.bulkSentToday >= tier.bulkCap) {
    return {
      allowed: false,
      retryAt: nextSendWindowStart(now, timeZone),
      reason: `Daily limit reached (${tier.bulkCap} bulk messages, warm-up stage ${tier.stage})`,
    };
  }
  if (input.recipientIsCold && input.coldSentToday >= tier.coldCap) {
    return {
      allowed: false,
      retryAt: nextSendWindowStart(now, timeZone),
      reason: `Daily limit reached for new contacts (${tier.coldCap}, warm-up stage ${tier.stage})`,
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
