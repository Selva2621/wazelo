import { EVENT_NAMES } from '@/common/constants';
import { AssignLeadUseCase } from './lead-follow-up.use-cases';

function setup(over: Partial<Record<string, jest.Mock>> = {}) {
  const repo = {
    findProduct: jest.fn(async () => ({ id: 'p1', name: 'Villa plots', leadHandlerIds: ['ravi', 'priya'], leadReminderMinutes: 30 })),
    findContact: jest.fn(async () => ({ id: 'c1', name: 'Arun', phoneNumber: '+919000020014', ownerId: 'someone' })),
    activeUserIds: jest.fn(async (_org: string, ids: string[]) => ids),
    loads: jest.fn(async () => [
      { userId: 'ravi', open: 2, lastAssignedAt: null },
      { userId: 'priya', open: 0, lastAssignedAt: null },
    ]),
    create: jest.fn(async () => ({ followUp: { id: 'f1' }, created: true })),
    setContactOwner: jest.fn(async () => ({})),
    ...over,
  };
  const events = { emit: jest.fn() };
  const useCase = new AssignLeadUseCase(repo as any, events as any);
  return { repo, events, useCase };
}

const lead = { orgId: 'o1', contactId: 'c1', productId: 'p1', leadgenId: 'lg1', isNewContact: true };

describe('AssignLeadUseCase', () => {
  it('gives the lead to the least busy team member, owns the new contact and notifies', async () => {
    const { repo, events, useCase } = setup();
    await useCase.execute(lead);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: 'priya', productId: 'p1', leadgenId: 'lg1' }));
    const due = (repo.create.mock.calls[0] as any)[0].dueAt.getTime() - Date.now();
    expect(due).toBeGreaterThan(29 * 60_000);
    expect(repo.setContactOwner).toHaveBeenCalledWith('c1', 'priya');
    expect(events.emit).toHaveBeenCalledWith(
      EVENT_NAMES.LEAD_ASSIGNED,
      expect.objectContaining({ assigneeId: 'priya', productName: 'Villa plots', reminderMinutes: 30 }),
    );
  });

  it("keeps an existing contact's owner for a repeat lead", async () => {
    const { repo, useCase } = setup();
    await useCase.execute({ ...lead, isNewContact: false });
    expect(repo.setContactOwner).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: 'priya' }));
  });

  it('without a team, reminds the contact owner and changes nothing else', async () => {
    const { repo, useCase } = setup({
      findProduct: jest.fn(async () => ({ id: 'p1', name: 'Villa plots', leadHandlerIds: [], leadReminderMinutes: 30 })),
    });
    await useCase.execute(lead);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: 'someone' }));
    expect(repo.setContactOwner).not.toHaveBeenCalled();
  });

  it('does nothing twice for the same lead (repeated webhook)', async () => {
    const { events, useCase } = setup({ create: jest.fn(async () => ({ followUp: { id: 'f1' }, created: false })) });
    await useCase.execute(lead);
    expect(events.emit).not.toHaveBeenCalled();
  });
});
