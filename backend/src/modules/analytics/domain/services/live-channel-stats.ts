/**
 * Pure logic for the live "messages today, per channel" stats
 * (Message City 3D dashboard). No I/O — the use-case feeds it raw rows.
 */

export const LIVE_CHANNEL_KEYS = [
  'WHATSAPP',
  'INSTAGRAM',
  'FACEBOOK_MESSENGER',
  'WEBSITE',
  'EMAIL',
] as const;

export type LiveChannelKey = (typeof LIVE_CHANNEL_KEYS)[number];

export interface LiveChannelStat {
  key: LiveChannelKey;
  inbound: number;
  outbound: number;
  delivered: number;
  read: number;
  failed: number;
  lastMessageAt: string | null;
}

/** One row of messages grouped by channel_type + direction. */
export interface ChannelMessageRow {
  channel: string | null;
  direction: string;
  total: number;
  delivered: number;
  read: number;
  failed: number;
  lastAt: Date | null;
}

/** One row of website-chat messages grouped by sender. */
export interface WidgetMessageRow {
  sender: string;
  total: number;
  lastAt: Date | null;
}

/** One row of emails grouped by status. */
export interface EmailMessageRow {
  status: string;
  total: number;
  lastAt: Date | null;
}

/**
 * Midnight of the requester's local "today", as a UTC instant.
 * offsetMinutes = local minus UTC in minutes (India = 330), so half-hour zones are exact.
 */
export function startOfLocalDay(now: Date, offsetMinutes = 0): Date {
  const offsetMs = offsetMinutes * 60 * 1000;
  const local = new Date(now.getTime() + offsetMs);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - offsetMs);
}

function emptyStat(key: LiveChannelKey): LiveChannelStat {
  return { key, inbound: 0, outbound: 0, delivered: 0, read: 0, failed: 0, lastMessageAt: null };
}

function later(a: string | null, b: Date | null): string | null {
  if (!b) return a;
  const iso = b.toISOString();
  return !a || iso > a ? iso : a;
}

/** Messages with no channel type are WhatsApp (they predate multi-channel). */
export function channelKeyFor(channel: string | null): LiveChannelKey | null {
  if (!channel) return 'WHATSAPP';
  return (LIVE_CHANNEL_KEYS as readonly string[]).includes(channel)
    ? (channel as LiveChannelKey)
    : null;
}

export function buildLiveChannelStats(input: {
  messages: ChannelMessageRow[];
  widget: WidgetMessageRow[];
  email: EmailMessageRow[];
}): LiveChannelStat[] {
  const map = new Map<LiveChannelKey, LiveChannelStat>(
    LIVE_CHANNEL_KEYS.map((k) => [k, emptyStat(k)]),
  );

  for (const row of input.messages) {
    const key = channelKeyFor(row.channel);
    if (!key) continue;
    const stat = map.get(key)!;
    if (row.direction === 'INBOUND') stat.inbound += row.total;
    else stat.outbound += row.total;
    stat.delivered += row.delivered;
    stat.read += row.read;
    stat.failed += row.failed;
    stat.lastMessageAt = later(stat.lastMessageAt, row.lastAt);
  }

  const web = map.get('WEBSITE')!;
  for (const row of input.widget) {
    if (row.sender === 'visitor') web.inbound += row.total;
    else if (row.sender === 'agent' || row.sender === 'bot') web.outbound += row.total;
    else continue; // system notices are not messages
    web.lastMessageAt = later(web.lastMessageAt, row.lastAt);
  }

  const email = map.get('EMAIL')!;
  for (const row of input.email) {
    if (row.status === 'SKIPPED') continue;
    email.outbound += row.total;
    if (row.status === 'SENT') email.delivered += row.total;
    if (row.status === 'FAILED') email.failed += row.total;
    email.lastMessageAt = later(email.lastMessageAt, row.lastAt);
  }

  return LIVE_CHANNEL_KEYS.map((k) => map.get(k)!);
}
