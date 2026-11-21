import { Injectable } from '@nestjs/common';
import { ContactSource, MessageDirection, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

/** ConsentRecord.consentType for "agreed to hear from you on WhatsApp" */
export const WHATSAPP_CONSENT_TYPE = 'whatsapp';

/** How a member got the contact's agreement (stored as ConsentRecord.source) */
export const WHATSAPP_PERMISSION_METHODS = ['call', 'email', 'in_person', 'other'] as const;
export type WhatsAppPermissionMethod = (typeof WHATSAPP_PERMISSION_METHODS)[number];

/** Reason shown on skipped recipients / steps / automation actions */
export const NO_WHATSAPP_PERMISSION_REASON =
  'No WhatsApp permission: lead finder contact has not messaged you or agreed to hear from you';

/**
 * messaged_first: the contact wrote to the org on WhatsApp
 * agreed: a member recorded their agreement
 * not_yet: lead finder contact with neither (business-started WhatsApp messages are skipped)
 * not_required: any other source (always permitted)
 */
export type WhatsAppPermissionStatus = 'messaged_first' | 'agreed' | 'not_yet' | 'not_required';

export interface PermissionContact {
  id: string;
  source: ContactSource;
  phoneNumber: string;
}

/**
 * The one place for the lead finder WhatsApp permission rule.
 *
 * WhatsApp only allows business-started messages to people who gave you their
 * number and agreed to hear from you. Businesses found with the lead finder
 * (source WEB_SCRAPE) haven't, so they get no campaign, sequence or automation
 * message until they either wrote to the org first or a member recorded their
 * agreement. Every other source is permitted. Manual inbox messages are not checked.
 */
@Injectable()
export class WhatsAppPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Only lead finder contacts need recorded permission */
  requiresPermission(source: ContactSource): boolean {
    return source === ContactSource.WEB_SCRAPE;
  }

  /** Single-contact check by id (unknown / deleted contacts are not permitted) */
  async hasPermission(orgId: string, contactId: string): Promise<boolean> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, orgId, deletedAt: null },
      select: { id: true, source: true, phoneNumber: true },
    });
    if (!contact) return false;
    return this.isPermitted(orgId, contact);
  }

  /** Single-contact check when the caller already loaded the contact */
  async isPermitted(orgId: string, contact: PermissionContact): Promise<boolean> {
    return (await this.getStatus(orgId, contact)) !== 'not_yet';
  }

  async getStatus(orgId: string, contact: PermissionContact): Promise<WhatsAppPermissionStatus> {
    if (!this.requiresPermission(contact.source)) return 'not_required';
    if (await this.hasInbound(orgId, contact.phoneNumber)) return 'messaged_first';
    if (await this.findActiveConsent(orgId, contact.id)) return 'agreed';
    return 'not_yet';
  }

  /** The active (granted, not revoked) WhatsApp consent record, if any */
  findActiveConsent(orgId: string, contactId: string) {
    return this.prisma.consentRecord.findFirst({
      where: { orgId, contactId, ...this.activeConsentWhere() },
      orderBy: { grantedAt: 'desc' },
    });
  }

  /**
   * Batch form for audiences: a where-clause to AND into a contact query so only
   * permitted contacts match. Two queries regardless of audience size: one for
   * lead finder contacts that wrote first, then the clause itself.
   */
  async permittedWhere(orgId: string): Promise<Prisma.ContactWhereInput> {
    const inboundIds = await this.leadFinderIdsWithInbound(orgId);
    return {
      OR: [
        { source: { not: ContactSource.WEB_SCRAPE } },
        { consentRecords: { some: { orgId, ...this.activeConsentWhere() } } },
        ...(inboundIds.length ? [{ id: { in: inboundIds } }] : []),
      ],
    };
  }

  /** The opposite of permittedWhere: lead finder contacts without permission */
  async notPermittedWhere(orgId: string): Promise<Prisma.ContactWhereInput> {
    const inboundIds = await this.leadFinderIdsWithInbound(orgId);
    return {
      source: ContactSource.WEB_SCRAPE,
      consentRecords: { none: { orgId, ...this.activeConsentWhere() } },
      ...(inboundIds.length ? { id: { notIn: inboundIds } } : {}),
    };
  }

  /** Batch check for a list of contacts: the ids that are permitted */
  async filterPermitted(orgId: string, contactIds: string[]): Promise<Set<string>> {
    if (!contactIds.length) return new Set();
    const rows = await this.prisma.contact.findMany({
      where: { AND: [{ orgId, id: { in: contactIds } }, await this.permittedWhere(orgId)] },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  /**
   * Of these contacts, the lead finder ones with no active WhatsApp consent yet:
   * the ones a batch "they agreed" recording should cover. One query.
   */
  async idsNeedingConsent(orgId: string, contactIds: string[]): Promise<string[]> {
    if (!contactIds.length) return [];
    const rows = await this.prisma.contact.findMany({
      where: {
        orgId,
        id: { in: contactIds },
        deletedAt: null,
        source: ContactSource.WEB_SCRAPE,
        consentRecords: { none: { orgId, ...this.activeConsentWhere() } },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private activeConsentWhere() {
    return { consentType: WHATSAPP_CONSENT_TYPE, granted: true, revokedAt: null };
  }

  /** Same inbound check as AccountSafetyService.isCold: phone with and without '+' */
  private async hasInbound(orgId: string, contactPhone: string): Promise<boolean> {
    const digits = contactPhone.replace(/^\+/, '');
    const inbound = await this.prisma.message.findFirst({
      where: {
        orgId,
        direction: MessageDirection.INBOUND,
        deletedAt: null,
        contactPhone: { in: [digits, `+${digits}`] },
      },
      select: { id: true },
    });
    return !!inbound;
  }

  /** Lead finder contacts in the org that have written to it on WhatsApp */
  private async leadFinderIdsWithInbound(orgId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM contacts c
      WHERE c.org_id = ${orgId}::uuid
        AND c.source = 'WEB_SCRAPE'
        AND c.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM messages m
          WHERE m.org_id = c.org_id
            AND m.direction = 'INBOUND'
            AND m.deleted_at IS NULL
            AND m.contact_phone IN (
              c.phone_number,
              ltrim(c.phone_number, '+'),
              '+' || ltrim(c.phone_number, '+')
            )
        )`;
    return rows.map((r) => r.id);
  }
}
