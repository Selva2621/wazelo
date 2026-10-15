import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateTicketUseCase, GetTicketUseCase, ReplyToTicketUseCase } from './ticket.use-cases';

const ticket = { id: 't-1', orgId: 'org-1', userId: 'u-1', title: 'Help', assignedToId: null, assignedTo: null };

function repo() {
  return {
    findById: jest.fn().mockResolvedValue(ticket),
    addReply: jest.fn().mockResolvedValue({ id: 'r-1' }),
  };
}

describe('Ticket internal notes', () => {
  describe('GetTicketUseCase', () => {
    it('never loads internal notes for a tenant', async () => {
      const r = repo();
      await new GetTicketUseCase(r as any).execute('t-1', 'org-1', false);
      expect(r.findById).toHaveBeenCalledWith('t-1', false);
    });

    it('loads internal notes for a super admin', async () => {
      const r = repo();
      await new GetTicketUseCase(r as any).execute('t-1', undefined, true);
      expect(r.findById).toHaveBeenCalledWith('t-1', true);
    });

    it("hides another org's ticket from a tenant", async () => {
      const r = repo();
      await expect(new GetTicketUseCase(r as any).execute('t-1', 'org-2', false)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('ReplyToTicketUseCase', () => {
    function useCase() {
      const r = repo();
      const prisma = { notification: { create: jest.fn() } };
      const events = { emit: jest.fn() };
      const audit = { record: jest.fn() };
      const notifier = { notify: jest.fn() };
      const uc = new ReplyToTicketUseCase(r as any, prisma as any, events as any, audit as any, notifier as any);
      return { r, prisma, events, notifier, uc };
    }

    it('notifies support when the customer replies', async () => {
      const { notifier, uc } = useCase();
      await uc.execute('t-1', { body: 'still broken' } as any, 'u-1', undefined, 'org-1');
      expect(notifier.notify).toHaveBeenCalledWith('customer_reply', ticket, 'still broken');
    });

    it('does not notify support about its own replies or notes', async () => {
      const { notifier, uc } = useCase();
      await uc.execute('t-1', { body: 'reply' } as any, undefined, 'sa-1');
      await uc.execute('t-1', { body: 'note', internal: true } as any, undefined, 'sa-1');
      expect(notifier.notify).not.toHaveBeenCalled();
    });

    it('ignores an `internal` flag smuggled into a tenant reply', async () => {
      const { r, uc } = useCase();
      await uc.execute('t-1', { body: 'hi', internal: true } as any, 'u-1', undefined, 'org-1');
      expect(r.addReply).toHaveBeenCalledWith('t-1', 'hi', 'u-1', undefined, false);
    });

    it('saves a super admin internal note without notifying the customer', async () => {
      const { r, prisma, uc } = useCase();
      await uc.execute('t-1', { body: 'note', internal: true } as any, undefined, 'sa-1');
      expect(r.addReply).toHaveBeenCalledWith('t-1', 'note', undefined, 'sa-1', true);
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('notifies the customer on a visible super admin reply', async () => {
      const { r, prisma, uc } = useCase();
      await uc.execute('t-1', { body: 'reply' } as any, undefined, 'sa-1');
      expect(r.addReply).toHaveBeenCalledWith('t-1', 'reply', undefined, 'sa-1', false);
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('refuses a tenant reply on a closed ticket', async () => {
      const { r, uc } = useCase();
      r.findById.mockResolvedValue({ ...ticket, status: 'CLOSED' });
      await expect(uc.execute('t-1', { body: 'hi' } as any, 'u-1', undefined, 'org-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(r.addReply).not.toHaveBeenCalled();
    });

    it('still lets support reply on a closed ticket', async () => {
      const { r, uc } = useCase();
      r.findById.mockResolvedValue({ ...ticket, status: 'CLOSED' });
      await uc.execute('t-1', { body: 'note', internal: true } as any, undefined, 'sa-1');
      expect(r.addReply).toHaveBeenCalled();
    });
  });
});

describe('CreateTicketUseCase', () => {
  const audit = { actor: { id: 'sa-1', email: 'a@x.com' }, meta: {} };
  const dto = { title: 'T', description: 'D', category: 'OTHER' } as any;

  function make(belongs: boolean) {
    const r = {
      userBelongsToOrg: jest.fn().mockResolvedValue(belongs),
      create: jest.fn().mockResolvedValue({ id: 't-9', title: 'T', description: 'D' }),
    };
    const notifier = { notify: jest.fn() };
    return { r, notifier, uc: new CreateTicketUseCase(r as any, { record: jest.fn() } as any, notifier as any) };
  }

  it('notifies support about a ticket opened by a tenant', async () => {
    const { notifier, uc } = make(true);
    await uc.execute('org-1', 'u-1', dto);
    expect(notifier.notify).toHaveBeenCalledWith('created', { id: 't-9', title: 'T', description: 'D' }, 'D');
  });

  it('does not notify support about a ticket a super admin opened', async () => {
    const { notifier, uc } = make(true);
    await uc.execute('org-1', 'u-1', dto, audit as any);
    expect(notifier.notify).not.toHaveBeenCalled();
  });

  it("rejects a super admin ticket for a user outside the org", async () => {
    const { r, uc } = make(false);
    await expect(uc.execute('org-1', 'u-other', dto, audit as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(r.create).not.toHaveBeenCalled();
  });

  it('creates it when the user belongs to the org', async () => {
    const { r, uc } = make(true);
    await uc.execute('org-1', 'u-1', dto, audit as any);
    expect(r.userBelongsToOrg).toHaveBeenCalledWith('u-1', 'org-1');
    expect(r.create).toHaveBeenCalled();
  });

  it('skips the check for tenant callers (ids come from their own token)', async () => {
    const { r, uc } = make(false);
    await uc.execute('org-1', 'u-1', dto);
    expect(r.userBelongsToOrg).not.toHaveBeenCalled();
  });
});
