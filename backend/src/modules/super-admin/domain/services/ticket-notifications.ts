export type TicketActivity = 'created' | 'customer_reply';

export interface TicketNotificationContent {
  type: string;
  title: string;
  body: string;
  link: string;
}

/**
 * Who hears about tenant activity on a ticket: its assignee while they can still sign in,
 * otherwise every enabled super admin (unassigned queue, or the assignee was disabled). Pure logic.
 */
export function ticketNotificationRecipients(assignedToId: string | null | undefined, enabledAdminIds: string[]): string[] {
  if (assignedToId && enabledAdminIds.includes(assignedToId)) return [assignedToId];
  return [...new Set(enabledAdminIds)];
}

const EXCERPT = 160;

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > EXCERPT ? `${flat.slice(0, EXCERPT - 1)}…` : flat;
}

/** Inbox entry for a new ticket or a customer reply. Pure logic. */
export function ticketNotificationContent(
  activity: TicketActivity,
  ticket: { id: string; title: string },
  details: { customerName?: string | null; text: string },
): TicketNotificationContent {
  const who = details.customerName?.trim() || 'A customer';
  const title = activity === 'created' ? `New ticket: ${ticket.title}` : `Customer replied: ${ticket.title}`;
  return {
    type: activity === 'created' ? 'TICKET_CREATED' : 'TICKET_CUSTOMER_REPLY',
    title: title.slice(0, 255),
    body: `${who}: ${excerpt(details.text)}`,
    link: `/super-admin/tickets/${ticket.id}`,
  };
}
