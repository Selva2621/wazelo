/**
 * Pure logic for Message City's insights (no I/O): messages per local hour for
 * today and yesterday, and average first-reply time per channel.
 */
import { channelKeyFor, LIVE_CHANNEL_KEYS, type LiveChannelKey } from './live-channel-stats';

const HOUR_MS = 60 * 60 * 1000;

export interface HourBucket {
  in: number;
  out: number;
}

export interface ChannelInsight {
  key: LiveChannelKey;
  today: HourBucket[];
  yesterday: HourBucket[];
  /** Average minutes to the first reply today; null when nothing was answered */
  replyMinutes: number | null;
  replies: number;
}

export interface CityInsights {
  /** Local hour now, 0–23 */
  currentHour: number;
  channels: ChannelInsight[];
  totalToday: number;
  /** Yesterday up to the same hour, for a fair comparison */
  totalYesterdaySameTime: number;
  replyMinutes: number | null;
}

const emptyDay = (): HourBucket[] => Array.from({ length: 24 }, () => ({ in: 0, out: 0 }));
const sum = (b: HourBucket[], upto = 24) => b.slice(0, upto).reduce((n, h) => n + h.in + h.out, 0);

/**
 * @param todayStart  local midnight today, as a UTC instant
 * @param offsetMinutes local minus UTC
 * Rows carry `localHour`: the hour start already shifted into local wall-clock time.
 */
export function buildCityInsights(input: {
  messages: { channel: string | null; direction: string; localHour: Date; total: number }[];
  widget: { sender: string; localHour: Date; total: number }[];
  replies: { channel: string | null; avgMinutes: number; replies: number }[];
  todayStart: Date;
  offsetMinutes: number;
  now: Date;
}): CityInsights {
  const map = new Map<LiveChannelKey, ChannelInsight>(
    LIVE_CHANNEL_KEYS.map((k) => [k, { key: k, today: emptyDay(), yesterday: emptyDay(), replyMinutes: null, replies: 0 }]),
  );
  // Local wall-clock start of yesterday (rows are in the same shifted frame)
  const yesterdayWall = input.todayStart.getTime() + input.offsetMinutes * 60_000 - 24 * HOUR_MS;

  const place = (key: LiveChannelKey, localHour: Date, dir: 'in' | 'out', n: number) => {
    const idx = Math.floor((localHour.getTime() - yesterdayWall) / HOUR_MS);
    if (idx < 0 || idx >= 48) return;
    const ch = map.get(key)!;
    const bucket = idx < 24 ? ch.yesterday[idx] : ch.today[idx - 24];
    bucket[dir] += n;
  };

  for (const r of input.messages) {
    const key = channelKeyFor(r.channel);
    if (key) place(key, r.localHour, r.direction === 'INBOUND' ? 'in' : 'out', r.total);
  }
  for (const r of input.widget) {
    if (r.sender === 'visitor') place('WEBSITE', r.localHour, 'in', r.total);
    else if (r.sender === 'agent' || r.sender === 'bot') place('WEBSITE', r.localHour, 'out', r.total);
  }

  let weighted = 0;
  let count = 0;
  for (const r of input.replies) {
    const key = channelKeyFor(r.channel);
    if (!key || !r.replies) continue;
    const ch = map.get(key)!;
    // Several rows can map to one key (null + WHATSAPP): combine as a weighted mean
    const total = ch.replies + r.replies;
    ch.replyMinutes = ((ch.replyMinutes ?? 0) * ch.replies + r.avgMinutes * r.replies) / total;
    ch.replies = total;
    weighted += r.avgMinutes * r.replies;
    count += r.replies;
  }

  const nowWall = input.now.getTime() + input.offsetMinutes * 60_000;
  const currentHour = Math.min(23, Math.max(0, Math.floor((nowWall - (yesterdayWall + 24 * HOUR_MS)) / HOUR_MS)));
  const channels = LIVE_CHANNEL_KEYS.map((k) => {
    const ch = map.get(k)!;
    return { ...ch, replyMinutes: ch.replyMinutes === null ? null : Math.round(ch.replyMinutes * 10) / 10 };
  });

  return {
    currentHour,
    channels,
    totalToday: channels.reduce((n, c) => n + sum(c.today), 0),
    totalYesterdaySameTime: channels.reduce((n, c) => n + sum(c.yesterday, currentHour + 1), 0),
    replyMinutes: count ? Math.round((weighted / count) * 10) / 10 : null,
  };
}
