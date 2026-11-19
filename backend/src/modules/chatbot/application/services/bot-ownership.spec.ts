import { BotBehaviorService } from './bot-behavior.service';
import { ChatbotRepository } from '../../infrastructure/repositories/chatbot.repository';

describe('Bots step back when a person owns the chat', () => {
  function setup() {
    const repo = {
      settings: jest.fn(async () => ({ pauseHours: 12 })),
      pause: jest.fn(async () => undefined),
      resume: jest.fn(async () => undefined),
      pauseByPhone: jest.fn(async () => 1),
    };
    const service = new BotBehaviorService(repo as never, { emit: jest.fn() } as never);
    return { service, repo };
  }

  it('pauses bots when the chat is assigned to someone', async () => {
    const { service, repo } = setup();
    await service.onAssigned({ orgId: 'o1', conversationId: 'c1', assignedToId: 'u1' });
    expect(repo.pause).toHaveBeenCalledWith('c1', 'o1', expect.any(Date));
  });

  it('lets bots answer again when the chat is unassigned', async () => {
    const { service, repo } = setup();
    await service.onAssigned({ orgId: 'o1', conversationId: 'c1', assignedToId: null });
    expect(repo.resume).toHaveBeenCalledWith('c1', 'o1');
    expect(repo.pause).not.toHaveBeenCalled();
  });

  it('pauses bots after a reply typed on the phone', async () => {
    const { service, repo } = setup();
    await service.onPhoneReply({ orgId: 'o1', sessionId: 's1', contactPhone: '919000000001' });
    expect(repo.pauseByPhone).toHaveBeenCalledWith('o1', 's1', '919000000001', expect.any(Date));
  });
});

describe('ChatbotRepository.findFirstMessageFlow', () => {
  const qualifier = { id: 'q', aiEnabled: false, trigger: { type: 'FIRST_MESSAGE' } };
  const assistant = { id: 'a', aiEnabled: true, trigger: { type: 'FIRST_MESSAGE' } };
  const keyword = { id: 'k', aiEnabled: false, trigger: { type: 'KEYWORD', value: 'price' } };

  function repoWith(flows: unknown[]) {
    const prisma = { chatbotFlow: { findMany: jest.fn(async () => flows) } };
    return new ChatbotRepository(prisma as never);
  }

  it('starts the step-by-step flow for a new chat', async () => {
    expect((await repoWith([assistant, qualifier, keyword]).findFirstMessageFlow('o1', true))?.id).toBe('q');
  });

  it('mid-conversation, only the AI assistant answers (no restarted questions)', async () => {
    expect((await repoWith([assistant, qualifier]).findFirstMessageFlow('o1', false))?.id).toBe('a');
    expect(await repoWith([qualifier]).findFirstMessageFlow('o1', false)).toBeUndefined();
  });
});
