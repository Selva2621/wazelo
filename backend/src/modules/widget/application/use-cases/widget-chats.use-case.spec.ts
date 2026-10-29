import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WidgetChatsUseCase } from './widget-chats.use-case';

function setup(session: Record<string, unknown> | null = { id: 's1', status: 'open' }) {
  const repo = {
    listChats: jest.fn(async () => ({
      rows: [
        { id: 's1', visitorName: 'Ravi', visitorPhone: null, visitorEmail: null, pageUrl: '/pricing', status: 'open', updatedAt: new Date(), messages: [{ body: 'Logo price?', sender: 'visitor', createdAt: new Date() }] },
        { id: 's2', visitorName: null, visitorPhone: null, visitorEmail: null, pageUrl: null, status: 'open', updatedAt: new Date(), messages: [{ body: 'Thanks!', sender: 'agent', createdAt: new Date() }] },
      ],
      total: 2,
    })),
    findSession: jest.fn(async () => session),
    findSessionMessages: jest.fn(async () => []),
    addMessage: jest.fn(async (_s: string, _o: string, sender: string, body: string) => ({ id: 'm1', sender, body, createdAt: new Date() })),
    touch: jest.fn(async () => undefined),
    setStatus: jest.fn(async () => undefined),
  };
  return { useCase: new WidgetChatsUseCase(repo as never), repo };
}

describe('WidgetChatsUseCase (Inbox → Website)', () => {
  it('lists chats and flags the ones waiting for a reply', async () => {
    const { useCase } = setup();
    const { data } = await useCase.list('o1');
    expect(data.map((c) => [c.id, c.waiting])).toEqual([['s1', true], ['s2', false]]);
  });

  it("stores a team reply as 'agent' (so the widget's AI steps back) and reopens a closed chat", async () => {
    const { useCase, repo } = setup({ id: 's1', status: 'closed' });
    await useCase.reply('o1', 's1', '  Yes, ₹4,999  ');
    expect(repo.addMessage).toHaveBeenCalledWith('s1', 'o1', 'agent', 'Yes, ₹4,999');
    expect(repo.touch).toHaveBeenCalledWith('s1');
    expect(repo.setStatus).toHaveBeenCalledWith('s1', 'o1', 'open');
  });

  it("rejects empty replies and other orgs' chats", async () => {
    await expect(setup().useCase.reply('o1', 's1', '   ')).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup(null).useCase.reply('o2', 's1', 'hi')).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup(null).useCase.messages('o2', 's1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
