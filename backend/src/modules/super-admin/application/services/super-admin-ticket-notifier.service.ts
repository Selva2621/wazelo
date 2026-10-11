import { Injectable, Logger } from '@nestjs/common';
import { SuperAdminRepository } from '../../infrastructure/repositories/super-admin.repository';
import { SuperAdminNotificationRepository } from '../../infrastructure/repositories/super-admin-notification.repository';
import {
  TicketActivity,
  ticketNotificationContent,
  ticketNotificationRecipients,
} from '../../domain/services/ticket-notifications';

export interface NotifiableTicket {
  id: string;
  title: string;
  assignedToId?: string | null;
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
}

/**
 * Drops a super admin inbox entry when a tenant opens a ticket or replies to one.
 * Best effort: never throws, so the tenant's request can't fail because of it.
 */
@Injectable()
export class SuperAdminTicketNotifier {
  private readonly logger = new Logger(SuperAdminTicketNotifier.name);

  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly notificationRepo: SuperAdminNotificationRepository,
  ) {}

  async notify(activity: TicketActivity, ticket: NotifiableTicket, text: string): Promise<void> {
    try {
      const admins = await this.superAdminRepo.findAll();
      const recipients = ticketNotificationRecipients(ticket.assignedToId, admins.map((a) => a.id));
      const name = [ticket.user?.firstName, ticket.user?.lastName].filter(Boolean).join(' ') || ticket.user?.email;
      const content = ticketNotificationContent(activity, ticket, { customerName: name, text });
      await this.notificationRepo.createMany(recipients.map((superAdminId) => ({ superAdminId, ...content })));
    } catch (err) {
      this.logger.error(
        `Failed to notify super admins about ticket ${ticket.id} (${activity}): ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
