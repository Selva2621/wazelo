import { ticketSla } from './ticket-sla';

const created = new Date('2026-10-10T10:00:00Z');
const base = { priority: 'HIGH', status: 'OPEN', createdAt: created, firstResponseAt: null as Date | null, lastReplyBy: null as string | null };

describe('ticketSla', () => {
  it('HIGH is due 4 hours after creation', () => {
    expect(ticketSla(base, created).dueAt.toISOString()).toBe('2026-10-10T14:00:00.000Z');
  });

  it('due while inside the target, breached after it', () => {
    expect(ticketSla(base, new Date('2026-10-10T13:59:00Z')).state).toBe('due');
    expect(ticketSla(base, new Date('2026-10-10T14:01:00Z')).state).toBe('breached');
  });

  it('met or missed once support has replied', () => {
    expect(ticketSla({ ...base, firstResponseAt: new Date('2026-10-10T11:00:00Z') }).state).toBe('met');
    expect(ticketSla({ ...base, firstResponseAt: new Date('2026-10-10T15:00:00Z') }).state).toBe('missed');
  });

  it('no SLA for a ticket closed without a reply', () => {
    expect(ticketSla({ ...base, status: 'CLOSED' }).state).toBe('none');
  });

  it('waiting on support when the customer spoke last on an open ticket', () => {
    expect(ticketSla(base).waitingOnSupport).toBe(true);
    expect(ticketSla({ ...base, lastReplyBy: 'CUSTOMER' }).waitingOnSupport).toBe(true);
    expect(ticketSla({ ...base, lastReplyBy: 'SUPPORT' }).waitingOnSupport).toBe(false);
    expect(ticketSla({ ...base, status: 'RESOLVED', lastReplyBy: 'CUSTOMER' }).waitingOnSupport).toBe(false);
  });
});
