import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ContactSource } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EVENT_NAMES } from '@/common/constants';
import { ContactRepository } from '@/modules/contacts/infrastructure/repositories/contact.repository';
import { NotificationDispatchService } from '@/modules/notifications/domain/services/notification-dispatch.service';
import type { ContactCreatedEvent } from '@/events/event-bus';

/** Tag on contacts that came from the website chat, so they're easy to filter */
export const WEBSITE_CHAT_TAG = 'website-chat';

interface WidgetMessageEvent {
  orgId: string;
  sessionId: string;
  messageId: string;
  visitorName?: string;
  visitorPhone?: string;
  body: string;
}

/**
 * "+91 98765-43210" → "+919876543210". Null when it isn't a plausible phone
 * number (8–15 digits), so typos never become contacts.
 */
export function normalizeVisitorPhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

/**
 * Website chat → CRM. A visitor who leaves a phone number becomes a contact
 * (tagged "website-chat"), so "contact created" rules and sequences, deals and
 * WhatsApp follow-up all apply; the team gets one alert per chat with the question.
 */
@Injectable()
export class WidgetLeadsService {
  private readonly logger = new Logger(WidgetLeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contacts: ContactRepository,
    private readonly notifications: NotificationDispatchService,
    private readonly events: EventEmitter2,
  ) {}

  @OnEvent(EVENT_NAMES.WIDGET_MESSAGE_RECEIVED, { async: true })
  async onWidgetMessage(event: WidgetMessageEvent): Promise<void> {
    try {
      await this.capture(event);
    } catch (err) {
      this.logger.warn(`Couldn't add website visitor to contacts: ${(err as Error).message}`);
    }
  }

  async capture(event: WidgetMessageEvent): Promise<{ contactId: string; created: boolean } | null> {
    const phone = normalizeVisitorPhone(event.visitorPhone);
    if (!phone) return null;

    // Contacts need an owner: the workspace's first admin
    const owner = await this.prisma.user.findFirst({
      where: { orgId: event.orgId, role: 'ADMIN', deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!owner) return null;

    const { contact, created } = await this.contacts.upsertByPhone(
      {
        orgId: event.orgId,
        phoneNumber: phone,
        name: event.visitorName?.trim() || undefined,
        source: ContactSource.WEBSITE,
        ownerId: owner.id,
        metadata: { from: 'website-chat' },
      },
      owner.id,
    );

    const tag = await this.contacts.findOrCreateTag(event.orgId, WEBSITE_CHAT_TAG);
    await this.contacts.addTagToContact(contact.id, tag.id, event.orgId, owner.id);

    if (created) {
      // Same as a contact added by the team: "contact created" rules and sequences run
      this.events.emit(EVENT_NAMES.CONTACT_CREATED, {
        contactId: contact.id,
        orgId: event.orgId,
        phoneNumber: phone,
        ownerId: owner.id,
        source: ContactSource.WEBSITE,
        createdById: owner.id,
      } satisfies ContactCreatedEvent);
    }

    // One alert per website chat: on the visitor's first message in it
    const visitorMessages = await this.prisma.widgetMessage.count({
      where: { sessionId: event.sessionId, sender: 'visitor' },
    });
    if (visitorMessages === 1) {
      const admins = await this.prisma.user.findMany({
        where: { orgId: event.orgId, role: { in: ['ADMIN', 'MANAGER'] }, deletedAt: null },
        select: { id: true },
      });
      const who = event.visitorName?.trim() || phone;
      await this.notifications.dispatchToOrg(
        event.orgId,
        admins.map((u) => u.id),
        'MESSAGE_RECEIVED',
        'HIGH',
        `${who} asked on your website`,
        event.body.slice(0, 200),
        { contactId: contact.id, widgetSessionId: event.sessionId, phoneNumber: phone },
        `widget-lead:${event.sessionId}`,
      );
    }

    return { contactId: contact.id, created };
  }
}
