import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { WidgetChatsUseCase } from './widget-chats.use-case';

const now = Date.now();

function setup(session: Record<string, unknown> | null = { id: 's1', status: 'open', state: 'AI', assignedToId: null }) {
  const repo = {
    listChats: jest.fn(async () => ({
      rows: [
        { id: 's1', visitorName: 'Ravi', visitorPhone: null, visitorEmail: null, pageUrl: '/pricing', status: 'open', state: 'AI', assignedToId: null, handoffRequestedAt: null, leadDecision: null, consentChannel: null, updatedAt: new Date(now), messages: [{ body: 'Logo price?', sender: 'visitor', createdAt: new Date() }] },
        { id: 's2', visitorName: null, visitorPhone: null, visitorEmail: null, pageUrl: null, status: 'open', state: 'WAITING', assignedToId: null, handoffRequestedAt: new Date(now - 60_000), leadDecision: null, consentChannel: null, updatedAt: new Date(now - 120_000), messages: [{ body: 'talk to a person', sender: 'visitor', createdAt: new Date() }] },
        { id: 's3', visitorName: 'Anu', visitorPhone: null, visitorEmail: null, pageUrl: null, status: 'open', state: 'PERSON', assignedToId: 'u2', handoffRequestedAt: null, leadDecision: null, consentChannel: null, updatedAt: new Date(now - 30_000), messages: [{ body: 'Thanks!', sender: 'agent', createdAt: new Date() }] },
      ],
      total: 3,
    })),
    findSession: jest.fn(async () => session),
    findSessionMessages: jest.fn(async () => []),
    addMessage: jest.fn(async (_s: string, _o: string, sender: string, body: string) => ({ id: 'm1', sender, body, createdAt: new Date() })),
    touch: jest.fn(async () => undefined),
    setStatus: jest.fn(async () => undefined),
  };
  const chats = {
    member: jest.fn(async (id: string) => ({ id, firstName: id === 'u2' ? 'Priya' : 'Ravi', lastName: '', role: 'EMPLOYEE' })),
    findOpenOffer: jest.fn(async (sessionId: string) => (sessionId === 's2' ? { id: 'of1' } : null)),
    reopen: jest.fn(async () => true),
  };
  const handoff = {
    accept: jest.fn(async () => ({})),
    end: jest.fn(async () => ({ ended: true })),
    activity: jest.fn(),
  };
  return { useCase: new WidgetChatsUseCase(repo as never, chats as never, handoff as never), repo, chats, handoff };
}

describe('WidgetChatsUseCase (Inbox → Website)', () => {
  it('lists chats: waiting-for-a-person first, with who has each chat and my offers', async () => {
    const { useCase } = setup();
    const { data } = await useCase.list('o1', 'open', 1, 30, 'u1');
    expect(data.map((c) => c.id)).toEqual(['s2', 's1', 's3']);
    expect(data[0]).toMatchObject({ state: 'WAITING', offeredToMe: true });
    expect(data.find((c) => c.id === 's3')?.assignedTo).toEqual({ id: 'u2', name: 'Priya' });
    expect(data.find((c) => c.id === 's1')?.waiting).toBe(true);
  });

  it('a reply in a chat with the AI takes the chat, is stored under the member, and refreshes inboxes', async () => {
    const { useCase, repo, handoff } = setup();
    await useCase.reply('o1', 's1', '  Yes, ₹4,999  ', 'u1');
    expect(handoff.accept).toHaveBeenCalledWith('o1', 's1', 'u1', 'REPLIED');
    expect(repo.addMessage).toHaveBeenCalledWith('s1', 'o1', 'agent', 'Yes, ₹4,999', 'u1');
    expect(repo.touch).toHaveBeenCalledWith('s1');
    expect(handoff.activity).toHaveBeenCalledWith('o1', 's1');
  });

  it("can't reply in a chat another member is handling", async () => {
    const { useCase, repo } = setup({ id: 's3', status: 'open', state: 'PERSON', assignedToId: 'u2' });
    await expect(useCase.reply('o1', 's3', 'hi', 'u1')).rejects.toBeInstanceOf(ConflictException);
    expect(repo.addMessage).not.toHaveBeenCalled();
  });

  it('replying to an ended chat reopens it for the member', async () => {
    const { useCase, chats, handoff } = setup({ id: 's1', status: 'closed', state: 'ENDED', assignedToId: null });
    await useCase.reply('o1', 's1', 'Hi again', 'u1');
    expect(chats.reopen).toHaveBeenCalledWith('s1', 'o1');
    expect(handoff.accept).toHaveBeenCalledWith('o1', 's1', 'u1', 'REPLIED');
  });

  it('closing a chat ends it, recorded under the member', async () => {
    const { useCase, handoff } = setup();
    await useCase.setStatus('o1', 's1', 'closed', 'u1');
    expect(handoff.end).toHaveBeenCalledWith('o1', 's1', { type: 'user', id: 'u1' }, 'MEMBER');
  });

  it("rejects empty replies and other orgs' chats", async () => {
    await expect(setup().useCase.reply('o1', 's1', '   ', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup(null).useCase.reply('o2', 's1', 'hi', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup(null).useCase.messages('o2', 's1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
