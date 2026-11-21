import type { Campaign } from "@/lib/types/campaigns";

/**
 * Hours WhatsApp campaigns send in, in the campaign's time zone.
 * Mirrors the backend SEND_SAFETY_CONFIG.CAMPAIGN_SEND_START_HOUR / _END_HOUR.
 * The campaign page reads the live window from the API; this copy is for screens
 * that have no campaign yet (create) or no analytics (the list).
 */
export const CAMPAIGN_SEND_HOURS = { startHour: 9, endHour: 21 } as const;

export interface SendWindow {
  startHour: number;
  endHour: number;
  timeZone: string;
}

function localHour(date: Date, timeZone: string): number | null {
  try {
    const hour = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" })
      .formatToParts(date)
      .find((p) => p.type === "hour")?.value;
    return hour === undefined ? null : Number(hour) % 24;
  } catch {
    return null;
  }
}

/** "9 AM" for an hour of the day */
export function hourLabel(hour: number): string {
  const d = new Date(Date.UTC(2000, 0, 1, hour));
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone: "UTC" }).format(d);
}

/** "9 AM – 9 PM" */
export const CAMPAIGN_SEND_HOURS_LABEL = `${hourLabel(CAMPAIGN_SEND_HOURS.startHour)} – ${hourLabel(CAMPAIGN_SEND_HOURS.endHour)}`;

export function isInsideSendWindow(date: Date, window: SendWindow): boolean {
  const hour = localHour(date, window.timeZone);
  return hour !== null && hour >= window.startHour && hour < window.endHour;
}

/**
 * Next time the window opens: walk forward hour by hour (≤ 25 steps) in the
 * campaign's time zone, which also handles DST changes.
 */
export function nextSendWindowOpening(from: Date, window: SendWindow): Date | null {
  const start = new Date(from);
  start.setUTCMinutes(0, 0, 0);
  for (let i = 1; i <= 25; i++) {
    const candidate = new Date(start.getTime() + i * 3_600_000);
    if (localHour(candidate, window.timeZone) === window.startHour) return candidate;
  }
  return null;
}

/** True when the campaign ignores sending hours ("Send any time") */
function sendsAnyTime(metadata: unknown): boolean {
  return !!metadata && typeof metadata === "object" && (metadata as Record<string, unknown>).sendAnyTime === true;
}

/**
 * For a scheduled WhatsApp campaign set outside sending hours: when its first
 * message will really go out. Null when it starts on time (or sends any time).
 */
export function actualStartAt(
  c: Pick<Campaign, "status" | "scheduledAt" | "timezone" | "channel" | "metadata">,
): Date | null {
  if (c.status !== "SCHEDULED" || !c.scheduledAt || c.channel === "EMAIL" || sendsAnyTime(c.metadata)) return null;
  const at = new Date(c.scheduledAt);
  const window = { ...CAMPAIGN_SEND_HOURS, timeZone: c.timezone || "UTC" };
  return isInsideSendWindow(at, window) ? null : nextSendWindowOpening(at, window);
}

/**
 * Create screen: the hour (0–23) of a `datetime-local` value ("2026-11-19T22:30"),
 * which is already wall-clock time in the campaign's zone.
 */
export function wallClockHour(value: string | null | undefined): number | null {
  const m = value?.match(/T(\d{2}):/);
  return m ? Number(m[1]) : null;
}

/** Current hour (0–23) in a time zone; the viewer's zone if unknown */
export function hourNowIn(timeZone: string | null | undefined): number {
  return localHour(new Date(), timeZone || "UTC") ?? new Date().getHours();
}

export function isInsideCampaignHours(hour: number): boolean {
  return hour >= CAMPAIGN_SEND_HOURS.startHour && hour < CAMPAIGN_SEND_HOURS.endHour;
}

/**
 * A campaign time in the campaign's own time zone, with the zone shown
 * ("19 Nov, 9:00 am IST"), so a viewer elsewhere isn't misled.
 * The year is added when it isn't the current one, or when `withYear` is set.
 */
export function formatInZone(
  dateStr: string | null | undefined,
  timeZone?: string | null,
  { withYear = false }: { withYear?: boolean } = {},
): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  const showYear = withYear || date.getFullYear() !== new Date().getFullYear();
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    ...(showYear && { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  try {
    return new Intl.DateTimeFormat("en-IN", { ...options, timeZone: timeZone || undefined }).format(date);
  } catch {
    // Unknown zone stored on the campaign: fall back to the viewer's zone
    return new Intl.DateTimeFormat("en-IN", options).format(date);
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/** The one time that matters for a campaign row: when it starts, started, or was created. */
export function campaignWhen(
  c: Pick<Campaign, "scheduledAt" | "startedAt" | "createdAt" | "timezone">,
): { label: "Scheduled" | "Started" | "Created"; value: string } {
  if (c.startedAt) return { label: "Started", value: formatInZone(c.startedAt, c.timezone) };
  if (c.scheduledAt) return { label: "Scheduled", value: formatInZone(c.scheduledAt, c.timezone) };
  return { label: "Created", value: timeAgo(c.createdAt) };
}
