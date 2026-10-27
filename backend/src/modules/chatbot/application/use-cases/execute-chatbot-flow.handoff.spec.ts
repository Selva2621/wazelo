import { ExecuteChatbotFlowUseCase } from './execute-chatbot-flow.use-case';

const flow = { id: 'flow-1', aiEnabled: true, useKnowledgeBase: true, aiSystemPrompt: null, trigger: { type: 'FIRST_MESSAGE' }, nodes: [] };
const payload = {
  orgId: 'org-1',
  conversationId: 'conv-1',
  contactId: 'contact-1',
  contactPhone: '919000000000',
  sessionId: 'wa-1',
  messageBody: 'Do you have an iPhone app?',
  messageType: 'text',
};

function setup(opts: { paused?: boolean; kb?: { answer: string; found: boolean; blocked?: string }; secondMiss?: boolean } = {}) {
  const deps = {
    prisma: { message: { findMany: jest.fn().mockResolvedValue([]) } },
    chatbotRepo: {
      findActiveSession: jest.fn().mockResolvedValue(null),
      findActiveFlowByTrigger: jest.fn(async (_org: string, type: string) => (type === 'FIRST_MESSAGE' ? flow : null)),
    },
    aiProvider: { complete: jest.fn().mockResolvedValue({ text: 'conversation-only reply' }) },
    outbound: { send: jest.fn().mockResolvedValue({ messageId: 'msg-1' }) },
    events: { emit: jest.fn() },
    usage: { isFeatureEnabled: jest.fn().mockResolvedValue(true) },
    credits: { canAfford: jest.fn().mockResolvedValue(true), charge: jest.fn() },
    crypto: { decryptBodies: (rows: unknown[]) => rows },
    kbAnswer: { answer: jest.fn().mockResolvedValue({ sources: [], confidence: 0.5, ...(opts.kb ?? { answer: 'We sell plans.', found: true }) }) },
    misses: { record: jest.fn().mockResolvedValue(undefined) },
    behavior: {
      isPaused: jest.fn().mockResolvedValue(!!opts.paused),
      handOff: jest.fn().mockResolvedValue('Someone from our team will reply shortly.'),
      missed: jest.fn().mockResolvedValue(!!opts.secondMiss),
      answered: jest.fn().mockResolvedValue(undefined),
    },
  };
  const useCase = new ExecuteChatbotFlowUseCase(
    deps.prisma as never,
    deps.chatbotRepo as never,
    {} as never,
    {} as never,
    deps.aiProvider as never,
    deps.outbound as never,
    deps.events as never,
    deps.usage as never,
    deps.credits as never,
    deps.crypto as never,
    deps.kbAnswer as never,
    deps.misses as never,
    deps.behavior as never,
  );
  const sent = () => deps.outbound.send.mock.calls.map((c) => c[0].body);
  return { useCase, deps, sent };
}

describe('AI chatbot handover', () => {
  it('stays quiet while the team has the chat', async () => {
    const { useCase, deps, sent } = setup({ paused: true });
    expect(await useCase.execute(payload)).toBeNull();
    expect(sent()).toEqual([]);
    expect(deps.kbAnswer.answer).not.toHaveBeenCalled();
  });

  it('hands over when the customer asks for a person, without spending credits', async () => {
    const { useCase, deps, sent } = setup();
    const result = await useCase.execute({ ...payload, messageBody: 'can I talk to a human?' });
    expect(result).toEqual(expect.objectContaining({ replied: true }));
    expect(deps.behavior.handOff).toHaveBeenCalledWith('org-1', 'conv-1', 'ASKED_FOR_PERSON');
    expect(sent()).toEqual(['Someone from our team will reply shortly.']);
    expect(deps.kbAnswer.answer).not.toHaveBeenCalled();
    expect(deps.credits.charge).not.toHaveBeenCalled();
  });

  it('answers from knowledge and resets the miss streak', async () => {
    const { useCase, deps, sent } = setup();
    await useCase.execute(payload);
    expect(sent()).toEqual(['We sell plans.']);
    expect(deps.behavior.answered).toHaveBeenCalledWith('conv-1');
    expect(deps.misses.record).not.toHaveBeenCalled();
    expect(deps.credits.charge).toHaveBeenCalledWith('org-1', 'chatbot_reply');
  });

  it('logs a first miss and sends the polite "will check" reply', async () => {
    const { useCase, deps, sent } = setup({ kb: { answer: "I'll check with the team.", found: false } });
    await useCase.execute(payload);
    expect(deps.misses.record).toHaveBeenCalledWith('org-1', payload.messageBody, 'WHATSAPP', 'conv-1');
    expect(deps.behavior.handOff).not.toHaveBeenCalled();
    expect(sent()).toEqual(["I'll check with the team."]);
  });

  it('hands over on the second miss in a row', async () => {
    const { useCase, deps, sent } = setup({ kb: { answer: "I'll check with the team.", found: false }, secondMiss: true });
    await useCase.execute(payload);
    expect(deps.misses.record).toHaveBeenCalled();
    expect(deps.behavior.handOff).toHaveBeenCalledWith('org-1', 'conv-1', 'UNANSWERED');
    expect(sent()).toEqual(['Someone from our team will reply shortly.']);
    expect(deps.credits.charge).not.toHaveBeenCalled();
  });

  it('hands over without charging when the KB answer was blocked', async () => {
    const { useCase, deps, sent } = setup({ kb: { answer: '', found: false, blocked: 'UNKNOWN_LINK' } });
    await useCase.execute(payload);
    expect(deps.behavior.handOff).toHaveBeenCalledWith('org-1', 'conv-1', 'REPLY_BLOCKED');
    expect(sent()).toEqual(['Someone from our team will reply shortly.']);
    expect(deps.credits.charge).not.toHaveBeenCalled();
    expect(deps.misses.record).not.toHaveBeenCalled();
  });

  it('hands over when a conversation-only reply has an unknown link', async () => {
    const { useCase, deps, sent } = setup({ kb: { answer: '', found: false } });
    deps.aiProvider.complete.mockResolvedValue({ text: 'Pay here: https://evil-pay.xyz' });
    await useCase.execute(payload);
    expect(deps.behavior.handOff).toHaveBeenCalledWith('org-1', 'conv-1', 'REPLY_BLOCKED');
    expect(sent()).toEqual(['Someone from our team will reply shortly.']);
    expect(deps.credits.charge).not.toHaveBeenCalled();
  });

  it('still replies when logging the miss fails', async () => {
    const { useCase, deps, sent } = setup({ kb: { answer: "I'll check with the team.", found: false } });
    deps.misses.record.mockRejectedValue(new Error('db down'));
    await useCase.execute(payload);
    expect(sent()).toEqual(["I'll check with the team."]);
  });
});
