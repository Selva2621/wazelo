import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContactSource } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EVENT_NAMES } from '@/common/constants';
import { ContactRepository } from '@/modules/contacts/infrastructure/repositories/contact.repository';
import { NotificationDispatchService } from '@/modules/notifications/domain/services/notification-dispatch.service';
import type { ContactCreatedEvent } from '@/events/event-bus';

/** Tag on contacts that came from the website chat, so they're easy to filter */
export const WEBSITE_CHAT_TAG = 'website-chat';

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

export interface ConsentedVisitor {
  orgId: string;
  sessionId: string;
  phone: string;
  email?: string | null;
  name?: string | null;
  /** The sentence the visitor agreed to, word for word */
  consentText: string;
  ipAddress?: string;
}

/**
 * Website chat → CRM, only with the visitor's consent. A visitor who ticks "I agree
 * to be contacted" becomes a contact (tagged "website-chat", with a consent record).
 * Their welcome — the "contact created" automations — is released separately when
 * the website chat ends, so nothing pings them on WhatsApp while they're still
 * chatting. Without consent the visitor stays a website chat only.
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

  /**
   * Saves the contact and the consent. `created`: a new contact, whose welcome the
   * caller holds until the chat ends. Null when the workspace has no admin to own it.
   */
  async capture(v: ConsentedVisitor): Promise<{ contactId: string; created: boolean } | null> {
    // Contacts need an owner: the workspace's first admin
    const owner = await this.prisma.user.findFirst({
      where: { orgId: v.orgId, role: 'ADMIN', deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!owner) return null;

    const { contact, created } = await this.contacts.upsertByPhone(
      {
        orgId: v.orgId,
        phoneNumber: v.phone,
        name: v.name?.trim() || undefined,
        source: ContactSource.WEBSITE,
        ownerId: owner.id,
        metadata: { from: 'website-chat', widgetSessionId: v.sessionId },
      },
      owner.id,
    );
    // The email they gave, unless the contact already has one
    if (v.email) {
      await this.prisma.contact.updateMany({ where: { id: contact.id, email: null }, data: { email: v.email } });
    }

    const tag = await this.contacts.findOrCreateTag(v.orgId, WEBSITE_CHAT_TAG);
    await this.contacts.addTagToContact(contact.id, tag.id, v.orgId, owner.id);

    // What they agreed to, when, and from where
    await this.prisma.consentRecord.create({
      data: {
        orgId: v.orgId,
        contactId: contact.id,
        consentType: 'messaging',
        granted: true,
        source: 'website_chat',
        ipAddress: v.ipAddress?.slice(0, 45),
        metadata: { channels: ['WHATSAPP', 'EMAIL'], text: v.consentText, widgetSessionId: v.sessionId },
      },
    });

    // Every new lead reaches the team (one alert per chat)
    const team = await this.prisma.user.findMany({
      where: { orgId: v.orgId, role: { in: ['ADMIN', 'MANAGER'] }, deletedAt: null },
      select: { id: true },
    });
    const who = v.name?.trim() || v.phone;
    await this.notifications.dispatchToOrg(
      v.orgId,
      team.map((u) => u.id),
      'MESSAGE_RECEIVED',
      'NORMAL',
      `${who} started a chat on your website`,
      created ? 'Saved as a contact. Your welcome message goes when the chat ends.' : 'Already a contact: the chat is linked to them.',
      { contactId: contact.id, widgetSessionId: v.sessionId, phoneNumber: v.phone },
      `widget-lead:${v.sessionId}`,
    );

    return { contactId: contact.id, created };
  }

  /**
   * The website chat ended: the new contact's "contact created" automations
   * (welcome message, sequences) run now, as for a contact the team added.
   */
  async releaseWelcome(orgId: string, contactId: string): Promise<boolean> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, orgId, deletedAt: null },
      select: { id: true, phoneNumber: true, ownerId: true, optedOut: true },
    });
    if (!contact || contact.optedOut) return false;
    this.events.emit(EVENT_NAMES.CONTACT_CREATED, {
      contactId: contact.id,
      orgId,
      phoneNumber: contact.phoneNumber,
      ownerId: contact.ownerId,
      source: ContactSource.WEBSITE,
      createdById: contact.ownerId,
    } satisfies ContactCreatedEvent);
    return true;
  }

  /**
   * A team member saves the visitor as a lead without the visitor's consent: the
   * contact exists for the team, but "contact created" automations don't run, so no
   * message goes out until the team (or the visitor) starts it.
   */
  async saveWithoutConsent(v: { orgId: string; sessionId: string; phone: string; email?: string | null; name?: string | null; userId: string }) {
    const { contact, created } = await this.contacts.upsertByPhone(
      {
        orgId: v.orgId,
        phoneNumber: v.phone,
        name: v.name?.trim() || undefined,
        source: ContactSource.WEBSITE,
        ownerId: v.userId,
        metadata: { from: 'website-chat', widgetSessionId: v.sessionId, consent: false, savedBy: v.userId },
      },
      v.userId,
    );
    if (v.email) {
      await this.prisma.contact.updateMany({ where: { id: contact.id, email: null }, data: { email: v.email } });
    }
    const tag = await this.contacts.findOrCreateTag(v.orgId, WEBSITE_CHAT_TAG);
    await this.contacts.addTagToContact(contact.id, tag.id, v.orgId, v.userId);
    return { contactId: contact.id, created };
  }
}
