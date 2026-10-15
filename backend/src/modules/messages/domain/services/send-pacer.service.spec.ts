import { SendPacerService } from './send-pacer.service';
import { SEND_SAFETY_CONFIG } from '@/common/constants';

describe('SendPacerService', () => {
  let pacer: SendPacerService;
  const now = 1_000_000;

  beforeEach(() => {
    pacer = new SendPacerService();
  });

  it('treats negative priority as bulk', () => {
    expect(pacer.laneFor(-1)).toBe('bulk');
    expect(pacer.laneFor(0)).toBe('direct');
    expect(pacer.laneFor(undefined)).toBe('direct');
  });

  it('sends the first message immediately', () => {
    expect(pacer.reserve('s1', 'direct', now)).toEqual({ sendAt: now, waitMs: 0 });
  });

  it('spaces bulk messages by at least the bulk gap', () => {
    const first = pacer.reserve('s1', 'bulk', now);
    const second = pacer.reserve('s1', 'bulk', now);
    const gap = second.sendAt - first.sendAt;

    expect(gap).toBeGreaterThanOrEqual(SEND_SAFETY_CONFIG.BULK_GAP_MIN_MS);
    expect(gap).toBeLessThanOrEqual(SEND_SAFETY_CONFIG.BULK_GAP_MAX_MS);
  });

  it('does not make direct replies wait for the bulk gap', () => {
    pacer.reserve('s1', 'bulk', now);
    const reply = pacer.reserve('s1', 'direct', now);

    expect(reply.waitMs).toBeLessThanOrEqual(SEND_SAFETY_CONFIG.DIRECT_GAP_MAX_MS);
  });

  it('never queues a reply behind a whole batch of reserved bulk slots', () => {
    for (let i = 0; i < 50; i++) pacer.reserve('s1', 'bulk', now);
    expect(pacer.reserve('s1', 'direct', now).waitMs).toBe(0);
  });

  it('spaces consecutive direct replies', () => {
    pacer.reserve('s1', 'direct', now);
    const second = pacer.reserve('s1', 'direct', now);
    expect(second.waitMs).toBeGreaterThanOrEqual(SEND_SAFETY_CONFIG.DIRECT_GAP_MIN_MS);
  });

  it('pushes the next bulk message back after a reply', () => {
    const reply = pacer.reserve('s1', 'direct', now);
    const bulk = pacer.reserve('s1', 'bulk', now);
    expect(bulk.sendAt).toBeGreaterThan(reply.sendAt);
  });

  it('gives every reservation a distinct slot', () => {
    const slots = Array.from({ length: 20 }, () => pacer.reserve('s1', 'bulk', now).sendAt);
    expect(new Set(slots).size).toBe(20);
  });

  it('paces sessions independently', () => {
    pacer.reserve('s1', 'bulk', now);
    expect(pacer.reserve('s2', 'bulk', now).waitMs).toBe(0);
  });

  it('starts fresh after reset', () => {
    pacer.reserve('s1', 'bulk', now);
    pacer.reset('s1');
    expect(pacer.reserve('s1', 'bulk', now).waitMs).toBe(0);
  });
});
