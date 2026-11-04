import { GenerateAutomationRuleUseCase } from './generate-automation-rule.use-case';

function setup(aiText: string, voice = { kind: 'TEAM', service: null as string | null }) {
  const aiProvider = { complete: jest.fn().mockResolvedValue({ text: aiText }) };
  const orgContext = {
    getContext: jest.fn().mockResolvedValue('## Business Context\nBusiness: Asha Designs'),
    getVoice: jest.fn().mockResolvedValue(voice),
    getRelevantKnowledge: jest.fn().mockResolvedValue(''),
  };
  return { useCase: new GenerateAutomationRuleUseCase(aiProvider as never, orgContext as never), aiProvider };
}

const rule = (triggerType: string, triggerConfig: Record<string, unknown> = {}) =>
  JSON.stringify({
    rule: {
      name: 'Chase proposal',
      description: 'When a deal reaches Proposal sent',
      triggerType,
      triggerConfig,
      actions: [{ actionType: 'SEND_MESSAGE', actionConfig: { messageBody: 'Hi {{contact.name}}, did you get my proposal?' }, orderIndex: 0, delaySeconds: 0 }],
      cooldownSeconds: null,
      maxExecutionsPerContact: null,
    },
    explanation: 'Chases a sent proposal.',
  });

describe('GenerateAutomationRuleUseCase', () => {
  it('keeps a DEAL_STAGE_CHANGED draft, without a stage the AI made up (the user picks it)', async () => {
    const { useCase } = setup(rule('DEAL_STAGE_CHANGED', { stageId: 'proposal-sent' }), { kind: 'FREELANCER', service: 'design' });
    const { rule: r } = await useCase.execute('o1', 'chase a proposal I sent');
    expect(r.triggerType).toBe('DEAL_STAGE_CHANGED');
    expect(r.triggerConfig).toEqual({});
  });

  it('still turns a truly unknown trigger into MESSAGE_RECEIVED', async () => {
    const { useCase } = setup(rule('SOMETHING_ELSE'));
    expect((await useCase.execute('o1', 'x')).rule.triggerType).toBe('MESSAGE_RECEIVED');
  });

  it('tells the AI which kind of workspace it writes for', async () => {
    const solo = setup(rule('NO_REPLY', { delaySeconds: 86400 }), { kind: 'FREELANCER', service: 'interior design' });
    await solo.useCase.execute('o1', 'nudge quiet clients');
    const soloPrompt = solo.aiProvider.complete.mock.calls[0][0].systemPrompt as string;
    expect(soloPrompt).toContain('Workspace: a solo freelancer offering interior design');
    expect(soloPrompt).toContain('first person singular ("I")');
    expect(soloPrompt).toContain('DEAL_STAGE_CHANGED');

    const team = setup(rule('CONTACT_CREATED'));
    await team.useCase.execute('o1', 'welcome new customers');
    const teamPrompt = team.aiProvider.complete.mock.calls[0][0].systemPrompt as string;
    expect(teamPrompt).toContain('Workspace: a business with a team');
    expect(teamPrompt).toContain('"we" / "our team"');
  });
});
