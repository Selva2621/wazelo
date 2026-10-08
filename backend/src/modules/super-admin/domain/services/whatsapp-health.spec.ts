import { assessMessagingHealth } from './whatsapp-health';

const now = new Date('2026-10-07T12:00:00Z');
const fresh = new Date(now.getTime() - 60_000);
const stale = new Date(now.getTime() - 30 * 60_000);

describe('assessMessagingHealth', () => {
  it('is NOT_CONNECTED with no sessions or channels', () => {
    expect(assessMessagingHealth({ sessions: [], channels: [], outboundTotal: 0, outboundFailed: 0, now }).status)
      .toBe('NOT_CONNECTED');
  });

  it('is DOWN when nothing is connected', () => {
    const r = assessMessagingHealth({
      sessions: [{ status: 'DISCONNECTED', lastHeartbeatAt: null }],
      channels: [{ status: 'ERROR' }],
      outboundTotal: 0,
      outboundFailed: 0,
      now,
    });
    expect(r.status).toBe('DOWN');
  });

  it('is HEALTHY with a fresh connected session and a low failure rate', () => {
    const r = assessMessagingHealth({
      sessions: [{ status: 'CONNECTED', lastHeartbeatAt: fresh }],
      channels: [],
      outboundTotal: 100,
      outboundFailed: 2,
      now,
    });
    expect(r).toMatchObject({ status: 'HEALTHY', reasons: [] });
    expect(r.failureRate).toBeCloseTo(0.02);
  });

  it('is DEGRADED for a stale heartbeat', () => {
    const r = assessMessagingHealth({
      sessions: [{ status: 'CONNECTED', lastHeartbeatAt: stale }],
      channels: [],
      outboundTotal: 0,
      outboundFailed: 0,
      now,
    });
    expect(r.status).toBe('DEGRADED');
    expect(r.reasons[0]).toMatch(/heartbeat/);
  });

  it('is DEGRADED for a high failure rate, but only with enough volume', () => {
    const base = { sessions: [{ status: 'CONNECTED' as const, lastHeartbeatAt: fresh }], channels: [], now };
    expect(assessMessagingHealth({ ...base, outboundTotal: 50, outboundFailed: 10 }).status).toBe('DEGRADED');
    expect(assessMessagingHealth({ ...base, outboundTotal: 5, outboundFailed: 3 }).status).toBe('HEALTHY');
  });

  it('flags a broken channel next to a working session', () => {
    const r = assessMessagingHealth({
      sessions: [{ status: 'CONNECTED', lastHeartbeatAt: fresh }],
      channels: [{ status: 'DISCONNECTED' }],
      outboundTotal: 0,
      outboundFailed: 0,
      now,
    });
    expect(r.status).toBe('DEGRADED');
  });
});
