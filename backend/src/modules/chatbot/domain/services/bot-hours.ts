export interface BotHours {
  hoursEnabled: boolean;
  /** Minutes from midnight, org timezone */
  openMinute: number;
  closeMinute: number;
  /** 0 = Sunday … 6 = Saturday */
  openDays: number[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Day of week and minute of day at `now` in `timeZone` (UTC if the zone is unknown). */
export function localTime(now: Date, timeZone: string): { day: number; minute: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  } catch {
    return localTime(now, 'UTC');
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { day: WEEKDAYS.indexOf(get('weekday')), minute: Number(get('hour')) * 60 + Number(get('minute')) };
}

/**
 * Whether the team is open. Hours off → always open. A close time at or before
 * the open time runs past midnight (e.g. 18:00–02:00 counts as the open day's).
 */
export function isOpen(hours: BotHours, timeZone: string, now = new Date()): boolean {
  if (!hours.hoursEnabled) return true;
  const { day, minute } = localTime(now, timeZone);
  const openOn = (d: number) => hours.openDays.includes(d);
  if (hours.closeMinute > hours.openMinute) {
    return openOn(day) && minute >= hours.openMinute && minute < hours.closeMinute;
  }
  return (openOn(day) && minute >= hours.openMinute) || (openOn((day + 6) % 7) && minute < hours.closeMinute);
}
