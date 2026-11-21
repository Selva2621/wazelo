import { AI_ACTIONS, costOf, isAiAction } from './ai-actions';

describe('costOf', () => {
  it('uses the default without an override', () => {
    expect(costOf('full_analysis', {})).toBe(AI_ACTIONS.full_analysis.defaultCost);
  });

  it('uses the super admin override, including 0 (free)', () => {
    expect(costOf('smart_reply', { smart_reply: 3 })).toBe(3);
    expect(costOf('smart_reply', { smart_reply: 0 })).toBe(0);
  });

  it('ignores a malformed override', () => {
    expect(costOf('smart_reply', { smart_reply: -1 })).toBe(1);
    expect(costOf('smart_reply', { smart_reply: 1.5 })).toBe(1);
  });
});

describe('isAiAction', () => {
  it('knows the catalog only', () => {
    expect(isAiAction('chatbot_reply')).toBe(true);
    expect(isAiAction('toString')).toBe(false);
    expect(isAiAction('nope')).toBe(false);
  });
});
