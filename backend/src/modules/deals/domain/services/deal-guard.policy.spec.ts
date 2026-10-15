import { ChatMessage, evaluateGhostRadar, evaluateTrust, scanForScamPatterns } from './deal-guard.policy';

const now = new Date('2026-10-12T10:00:00.000Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

function msg(overrides: Partial<ChatMessage>): ChatMessage {
  return { direction: 'OUTBOUND', body: 'hi', status: 'DELIVERED', createdAt: daysAgo(0), sentAt: null, readAt: null, ...overrides };
}

describe('evaluateGhostRadar', () => {
  const base = { stageName: 'Proposal sent', contactName: 'Ravi Kumar', now };

  it('reports no chat', () => {
    expect(evaluateGhostRadar({ ...base, messages: [] }).level).toBe('no_chat');
  });

  it("says it's your turn when the client wrote last", () => {
    const radar = evaluateGhostRadar({
      ...base,
      messages: [msg({ createdAt: daysAgo(2) }), msg({ direction: 'INBOUND', createdAt: daysAgo(1) })],
    });
    expect(radar.level).toBe('your_turn');
  });

  it('is active right after you message', () => {
    expect(evaluateGhostRadar({ ...base, messages: [msg({ createdAt: daysAgo(0.2) })] }).level).toBe('active');
  });

  it('goes cold when the quote was read 3+ days ago with no reply, and suggests a stage nudge', () => {
    const radar = evaluateGhostRadar({
      ...base,
      messages: [msg({ status: 'READ', createdAt: daysAgo(4), readAt: daysAgo(3.5) })],
    });
    expect(radar.level).toBe('cold');
    expect(radar.suggestion).toContain('Hi Ravi');
    expect(radar.suggestion).toContain('proposal');
  });

  it('is slow when unread for 2 days, cold after 5', () => {
    expect(evaluateGhostRadar({ ...base, messages: [msg({ createdAt: daysAgo(2.5) })] }).level).toBe('slow');
    expect(evaluateGhostRadar({ ...base, messages: [msg({ createdAt: daysAgo(6) })] }).level).toBe('cold');
  });
});

describe('scanForScamPatterns', () => {
  it.each([
    'Please pay the registration fee of ₹999 to start',
    'You need to deposit ₹2000 first before we start the project',
    'Join our telegram group for daily tasks',
    'Please send the OTP you received',
    'I will pay you in USDT',
    'I sent a cheque for more than the amount, please refund the extra',
  ])('flags %p', (body) => {
    expect(scanForScamPatterns([msg({ direction: 'INBOUND', body })]).length).toBeGreaterThanOrEqual(1);
  });

  it('ignores normal client talk and your own messages', () => {
    expect(
      scanForScamPatterns([
        msg({ direction: 'INBOUND', body: 'Budget is 15k, can you start next week?' }),
        msg({ direction: 'OUTBOUND', body: 'Registration fee is not needed' }),
      ]),
    ).toEqual([]);
  });

  it('reports each pattern once', () => {
    const body = 'pay the registration fee';
    expect(scanForScamPatterns([msg({ direction: 'INBOUND', body }), msg({ direction: 'INBOUND', body })])).toHaveLength(1);
  });
});

describe('evaluateTrust', () => {
  const history = { won: 0, lost: 0, open: 1 };

  it('asks for 100% upfront when scam patterns appear', () => {
    const card = evaluateTrust({ messages: [msg({ direction: 'INBOUND', body: 'pay the joining fee' })], history });
    expect(card).toMatchObject({ standing: 'risky', suggestedAdvancePct: 100 });
  });

  it('suggests 50% for a first-time client and 30% for a returning one', () => {
    expect(evaluateTrust({ messages: [], history }).suggestedAdvancePct).toBe(50);
    expect(evaluateTrust({ messages: [], history: { won: 2, lost: 0, open: 1 } })).toMatchObject({
      standing: 'returning',
      suggestedAdvancePct: 30,
    });
  });
});
