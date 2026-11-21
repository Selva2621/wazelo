import { ServiceUnavailableException } from '@nestjs/common';
import { parseReadout, ReadChatUseCase } from './read-chat.use-case';

const GOOD = JSON.stringify({
  mood: 'NEUTRAL',
  confidence: 0.8,
  moodReason: 'asked politely about price',
  wants: 'purchase',
  wantsDetail: 'website package price',
  nextStep: 'send_catalog',
  mentioned: { budget: '15000', date: 'null' },
  tags: ['Warm Lead', 'Warm Lead', 'Website'],
  priority: 'MEDIUM',
  language: 'EN',
});

describe('ReadChatUseCase', () => {
  function setup(aiText = GOOD) {
    let lastInbound: { id: string } | null = { id: 'm2' };
    const prisma = {
      message: {
        findFirst: jest.fn(async () => lastInbound),
        findMany: jest.fn(async () => [
          { id: lastInbound?.id ?? 'm1', direction: 'INBOUND', body: 'How much is the website?', type: 'TEXT' },
          { id: 'm1', direction: 'OUTBOUND', body: 'Hi Arun!', type: 'TEXT' },
        ]),
      },
      tag: { findMany: jest.fn(async () => [{ name: 'Warm Lead' }]) },
    };
    const aiProvider = { complete: jest.fn(async () => ({ text: aiText })) };
    const orgContext = { getContext: jest.fn(async () => 'BUSINESS') };
    const crypto = { decryptBodies: jest.fn((rows: unknown[]) => rows) };
    const useCase = new ReadChatUseCase(prisma as never, aiProvider as never, orgContext as never, crypto as never);
    return {
      useCase,
      aiProvider,
      newCustomerMessage: (id: string) => (lastInbound = { id }),
      noInbound: () => (lastInbound = null),
    };
  }

  it('reads everything with a single AI call', async () => {
    const { useCase, aiProvider } = setup();
    const out = await useCase.read('c1', 'o1');
    expect(aiProvider.complete).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({
      status: 'ready',
      upToDate: true,
      readout: { mood: 'NEUTRAL', wants: 'purchase', tags: ['Warm Lead', 'Website'] },
    });
  });

  it('reuses the read for free until the customer writes again', async () => {
    const { useCase, aiProvider, newCustomerMessage } = setup();
    await useCase.read('c1', 'o1');
    await useCase.read('c1', 'o1'); // nothing new: no AI call
    expect(aiProvider.complete).toHaveBeenCalledTimes(1);

    newCustomerMessage('m3');
    expect(await useCase.peek('c1', 'o1')).toMatchObject({ status: 'ready', upToDate: false });
    await useCase.read('c1', 'o1'); // new message: reads again
    expect(aiProvider.complete).toHaveBeenCalledTimes(2);
  });

  it('peek never calls the AI and says when nothing was read yet', async () => {
    const { useCase, aiProvider } = setup();
    expect(await useCase.peek('c1', 'o1')).toEqual({ status: 'not_read' });
    expect(aiProvider.complete).not.toHaveBeenCalled();
  });

  it("doesn't call the AI before the customer has written", async () => {
    const { useCase, aiProvider, noInbound } = setup();
    noInbound();
    expect(await useCase.read('c1', 'o1')).toEqual({ status: 'no_customer_messages' });
    expect(aiProvider.complete).not.toHaveBeenCalled();
  });

  it("keeps one org's read away from another", async () => {
    const { useCase } = setup();
    await useCase.read('c1', 'o1');
    expect(await useCase.peek('c1', 'o2')).toEqual({ status: 'not_read' });
  });

  it('fails (so no credit is charged) when the AI answer is unusable', async () => {
    const { useCase } = setup('I am not sure.');
    await expect(useCase.read('c1', 'o1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('parseReadout', () => {
  it('cleans the answer: drops "null" details, de-duplicates tags, lower-cases language', () => {
    const r = parseReadout('```json\n' + GOOD + '\n```')!;
    expect(r.mentioned).toEqual({ budget: '15000' });
    expect(r.tags).toEqual(['Warm Lead', 'Website']);
    expect(r.language).toBe('en');
  });

  it('falls back to safe values for unknown choices', () => {
    const r = parseReadout(JSON.stringify({ mood: 'URGENT', wants: 'world peace', nextStep: 'dance', priority: 'P0' }))!;
    expect(r).toMatchObject({ wants: 'other', nextStep: 'no_action', priority: 'MEDIUM', confidence: 0.5 });
  });

  it('rejects answers without a valid mood', () => {
    expect(parseReadout('{"mood":"meh"}')).toBeNull();
    expect(parseReadout('nope')).toBeNull();
  });
});
