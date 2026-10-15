import { ticketNotificationContent, ticketNotificationRecipients } from './ticket-notifications';

describe('ticketNotificationRecipients', () => {
  it('notifies only the assignee when they are enabled', () => {
    expect(ticketNotificationRecipients('a2', ['a1', 'a2', 'a3'])).toEqual(['a2']);
  });

  it('notifies every enabled super admin when unassigned', () => {
    expect(ticketNotificationRecipients(null, ['a1', 'a2'])).toEqual(['a1', 'a2']);
  });

  it('falls back to everyone when the assignee is disabled', () => {
    expect(ticketNotificationRecipients('gone', ['a1', 'a2'])).toEqual(['a1', 'a2']);
  });
});

describe('ticketNotificationContent', () => {
  const ticket = { id: 't-1', title: 'Cannot send' };

  it('links to the ticket and names the customer', () => {
    const c = ticketNotificationContent('created', ticket, { customerName: 'Asha', text: 'Messages fail' });
    expect(c).toEqual({
      type: 'TICKET_CREATED',
      title: 'New ticket: Cannot send',
      body: 'Asha: Messages fail',
      link: '/super-admin/tickets/t-1',
    });
  });

  it('shortens long replies to an excerpt', () => {
    const c = ticketNotificationContent('customer_reply', ticket, { text: 'x'.repeat(500) });
    expect(c.type).toBe('TICKET_CUSTOMER_REPLY');
    expect(c.body.startsWith('A customer: ')).toBe(true);
    expect(c.body.length).toBeLessThan(200);
  });
});
