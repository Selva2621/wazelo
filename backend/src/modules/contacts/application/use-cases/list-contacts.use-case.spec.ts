import { ListContactsUseCase } from './list-contacts.use-case';

describe('ListContactsUseCase.pipelineMeta', () => {
  const ids = ['c1', 'c2'];
  let contactRepository: { getPipelineMeta: jest.Mock };
  let teamRepository: { getMemberUserIds: jest.Mock };
  let useCase: ListContactsUseCase;

  beforeEach(() => {
    contactRepository = { getPipelineMeta: jest.fn().mockResolvedValue([]) };
    teamRepository = { getMemberUserIds: jest.fn().mockResolvedValue(['u1', 'u2']) };
    useCase = new ListContactsUseCase(contactRepository as never, teamRepository as never);
  });

  it('limits an employee to their own contacts', async () => {
    await useCase.pipelineMeta('org', 'u1', 'EMPLOYEE', ids);
    expect(contactRepository.getPipelineMeta).toHaveBeenCalledWith('org', ids, { ownerId: 'u1' });
  });

  it('limits a manager to their team', async () => {
    await useCase.pipelineMeta('org', 'u1', 'MANAGER', ids);
    expect(contactRepository.getPipelineMeta).toHaveBeenCalledWith('org', ids, { ownerIds: ['u1', 'u2'] });
  });

  it('lets an admin see every contact in the org', async () => {
    await useCase.pipelineMeta('org', 'u1', 'ADMIN', ids);
    expect(contactRepository.getPipelineMeta).toHaveBeenCalledWith('org', ids, { ownerId: undefined });
  });
});
