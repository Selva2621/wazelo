import { NotFoundException } from '@nestjs/common';
import { GetTicketUseCase, ReplyToTicketUseCase } from './ticket.use-cases';

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
      return { r, prisma, events, uc: new ReplyToTicketUseCase(r as any, prisma as any, events as any, audit as any) };
    }

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
  });
});
