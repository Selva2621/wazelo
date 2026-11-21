import { ServiceUnavailableException } from '@nestjs/common';
import { GetSmartRepliesUseCase, parseReplies } from './get-smart-replies.use-case';

describe('GetSmartRepliesUseCase', () => {
  const messages = [
    // newest first, as the DB returns them
    { direction: 'INBOUND', body: 'How much is the website package?', type: 'TEXT', createdAt: new Date(2) },
    { direction: 'OUTBOUND', body: 'Hi Arun, thanks for writing in!', type: 'TEXT', createdAt: new Date(1) },
  ];

  function setup(aiText: string, knowledge = { prompt: 'PASSAGES', sources: ['Pricing'] }) {
    const prisma = { message: { findMany: jest.fn().mockResolvedValue(messages.map((m) => ({ ...m }))) } };
    const aiProvider = { complete: jest.fn().mockResolvedValue({ text: aiText }) };
    const orgContext = {
      getContext: jest.fn().mockResolvedValue('BUSINESS'),
      getRelevantKnowledgeWithSources: jest.fn().mockResolvedValue(knowledge),
    };
    const crypto = { decryptBodies: jest.fn((rows: unknown[]) => rows) };
    const useCase = new GetSmartRepliesUseCase(prisma as never, aiProvider as never, orgContext as never, crypto as never);
    return { useCase, aiProvider, orgContext };
  }

  it('returns three replies with the knowledge sources they used', async () => {
    const { useCase } = setup('```json\n["Starter is ₹15,000.", "It takes 2 weeks.", "Want the details?"]\n```');
    const out = await useCase.execute('c1', 'o1');
    expect(out).toEqual({
      replies: ['Starter is ₹15,000.', 'It takes 2 weeks.', 'Want the details?'],
      sources: ['Pricing'],
    });
  });

  it('puts the tone, the goal and the knowledge into the prompt', async () => {
    const { useCase, aiProvider, orgContext } = setup('["a","b","c"]');
    await useCase.execute('c1', 'o1', { tone: 'formal', goal: 'ask for their budget' });

    const { systemPrompt } = aiProvider.complete.mock.calls[0][0];
    expect(systemPrompt).toContain('BUSINESS');
    expect(systemPrompt).toContain('PASSAGES');
    expect(systemPrompt).toContain('polite and formal');
    expect(systemPrompt).toContain('ask for their budget');
    // Knowledge is looked up for what the customer asked plus the goal
    expect(orgContext.getRelevantKnowledgeWithSources.mock.calls[0][1]).toBe(
      'How much is the website package? ask for their budget',
    );
  });

  it('defaults to a friendly tone', async () => {
    const { useCase, aiProvider } = setup('["a","b","c"]');
    await useCase.execute('c1', 'o1', { tone: 'rude' as never });
    expect(aiProvider.complete.mock.calls[0][0].systemPrompt).toContain('warm and friendly');
  });

  it('fails instead of showing canned replies when the AI answer is unreadable', async () => {
    const { useCase } = setup('Sorry, I cannot help with that.');
    await expect(useCase.execute('c1', 'o1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('parseReplies', () => {
  it('drops blanks and duplicates and keeps at most three', () => {
    expect(parseReplies('["Hi", " ", "Hi", "Yes", "No", "Maybe"]')).toEqual(['Hi', 'Yes', 'No']);
  });

  it('returns nothing for non-arrays', () => {
    expect(parseReplies('{"a":1}')).toEqual([]);
    expect(parseReplies('not json')).toEqual([]);
  });
});
