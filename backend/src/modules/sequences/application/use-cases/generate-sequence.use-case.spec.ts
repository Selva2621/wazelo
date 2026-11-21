import { GenerateSequenceUseCase } from './generate-sequence.use-case';

const DRAFT = JSON.stringify({
  name: 'Proposal follow-up',
  description: 'Chases a sent proposal',
  steps: [
    { name: 'Intro', delayMinutes: 0, messageBody: 'Hi {{contact.name}}, I sent the proposal this morning.' },
    { name: 'Last check-in', delayMinutes: 2880, messageBody: 'Just checking if you had any questions?' },
  ],
});

function setup(voice: { kind: string; service: string | null }) {
  const aiProvider = { complete: jest.fn().mockResolvedValue({ text: DRAFT }) };
  const orgContext = {
    getContext: jest.fn().mockResolvedValue(''),
    getVoice: jest.fn().mockResolvedValue(voice),
    getRelevantKnowledge: jest.fn().mockResolvedValue(''),
  };
  const useCase = new GenerateSequenceUseCase(aiProvider as never, orgContext as never);
  const systemPrompt = () => aiProvider.complete.mock.calls[0][0].systemPrompt as string;
  return { useCase, systemPrompt };
}

describe('GenerateSequenceUseCase voice', () => {
  it('drafts as the freelancer ("I") to a client', async () => {
    const { useCase, systemPrompt } = setup({ kind: 'FREELANCER', service: 'web design' });
    await useCase.generate('o1', 'follow up on a proposal', 2);
    expect(systemPrompt()).toContain('solo freelancer offering web design writing to a client');
    expect(systemPrompt()).toContain('Never say "we" or "our team"');
  });

  it('drafts as the business ("we") to a customer, and rewrites in the same voice', async () => {
    const { useCase, systemPrompt } = setup({ kind: 'TEAM', service: null });
    await useCase.rewriteStep('o1', 'Hi there', 'formal');
    expect(systemPrompt()).toContain('business with a team writing to a customer');
    expect(systemPrompt()).toContain('"we" / "our team"');
  });
});
