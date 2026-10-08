export type MessagingHealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'NOT_CONNECTED';

export interface SessionHealthInput {
  status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';
  lastHeartbeatAt: Date | null;
}

export interface ChannelHealthInput {
  status: 'PENDING_SETUP' | 'VERIFYING' | 'ACTIVE' | 'SUSPENDED' | 'ERROR' | 'DISCONNECTED';
}

export interface HealthAssessment {
  status: MessagingHealthStatus;
  /** Human-readable reasons, most important first */
  reasons: string[];
  failureRate: number | null;
}

/** A CONNECTED session whose heartbeat is older than this is treated as stale. */
export const STALE_HEARTBEAT_MS = 10 * 60 * 1000;
/** Below this many outbound messages the failure rate is too noisy to judge. */
export const MIN_SAMPLE = 20;
export const FAILURE_RATE_THRESHOLD = 0.1;

/**
 * Overall WhatsApp/channel health for one org, for support triage.
 * Pure — every input is passed in, including `now`.
 */
export function assessMessagingHealth(input: {
  sessions: SessionHealthInput[];
  channels: ChannelHealthInput[];
  outboundTotal: number;
  outboundFailed: number;
  now?: Date;
}): HealthAssessment {
  const now = input.now ?? new Date();
  const { sessions, channels } = input;
  const failureRate = input.outboundTotal > 0 ? input.outboundFailed / input.outboundTotal : null;

  if (sessions.length === 0 && channels.length === 0) {
    return { status: 'NOT_CONNECTED', reasons: ['No WhatsApp number or channel connected'], failureRate };
  }

  const liveSessions = sessions.filter((s) => s.status === 'CONNECTED');
  const liveChannels = channels.filter((c) => c.status === 'ACTIVE');
  if (liveSessions.length === 0 && liveChannels.length === 0) {
    return { status: 'DOWN', reasons: ['No connected WhatsApp number or active channel'], failureRate };
  }

  const reasons: string[] = [];
  const brokenSessions = sessions.filter((s) => s.status === 'DISCONNECTED' || s.status === 'RECONNECTING');
  if (brokenSessions.length) reasons.push(`${brokenSessions.length} WhatsApp session(s) disconnected`);

  const stale = liveSessions.filter(
    (s) => !s.lastHeartbeatAt || now.getTime() - s.lastHeartbeatAt.getTime() > STALE_HEARTBEAT_MS,
  );
  if (stale.length) reasons.push(`${stale.length} connected session(s) with no heartbeat in 10+ minutes`);

  const badChannels = channels.filter((c) => c.status === 'ERROR' || c.status === 'DISCONNECTED' || c.status === 'SUSPENDED');
  if (badChannels.length) reasons.push(`${badChannels.length} channel(s) in error, disconnected or suspended`);

  if (failureRate !== null && input.outboundTotal >= MIN_SAMPLE && failureRate >= FAILURE_RATE_THRESHOLD) {
    reasons.push(`${Math.round(failureRate * 100)}% of outbound messages failed in the last 7 days`);
  }

  return { status: reasons.length ? 'DEGRADED' : 'HEALTHY', reasons, failureRate };
}
