import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction, Contact } from '@prisma/client';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import {
  WHATSAPP_CONSENT_TYPE,
  WhatsAppPermissionService,
  WhatsAppPermissionStatus,
} from '../../domain/services/whatsapp-permission.service';
import { RecordWhatsAppPermissionDto } from '../dto/whatsapp-permission.dto';

export interface WhatsAppPermissionView {
  contactId: string;
  /** Only lead finder contacts need permission */
  required: boolean;
  status: WhatsAppPermissionStatus;
  /** The active recorded agreement, if any (also set when status is messaged_first) */
  agreement: {
    id: string;
    how: string;
    note: string | null;
    recordedBy: string | null;
    grantedAt: Date;
  } | null;
}

/**
 * Lead finder contacts get no campaign, sequence or automation WhatsApp message
 * until they wrote first or a member records that they agreed (call, email, in person…).
 */
@Injectable()
export class WhatsAppPermissionUseCase {
  private readonly logger = new Logger(WhatsAppPermissionUseCase.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly permission: WhatsAppPermissionService,
    private readonly auditService: AuditService,
  ) {}

  async getStatus(contactId: string, orgId: string): Promise<WhatsAppPermissionView> {
    const contact = await this.loadContact(contactId, orgId);
    return this.view(contact, orgId);
  }

  async record(
    contactId: string,
    orgId: string,
    userId: string,
    dto: RecordWhatsAppPermissionDto,
    ipAddress?: string,
    userAgent?: string | string[],
  ): Promise<WhatsAppPermissionView> {
    const contact = await this.loadContact(contactId, orgId);
    const note = dto.note?.trim() || null;

    // One active agreement per contact: a new recording replaces the old one
    await this.contactRepository.revokeConsentRecords(orgId, contactId, WHATSAPP_CONSENT_TYPE);
    const record = await this.contactRepository.createConsentRecord({
      orgId,
      contactId,
      consentType: WHATSAPP_CONSENT_TYPE,
      source: dto.how,
      ipAddress,
      metadata: { recordedBy: userId, note },
    });

    this.logger.log(`WhatsApp permission recorded for contact ${contactId} (${dto.how})`);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_UPDATED,
      targetType: 'Contact',
      targetId: contactId,
      metadata: { change: 'whatsapp_permission_recorded', how: dto.how, note, consentRecordId: record.id },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    return this.view(contact, orgId);
  }

  /**
   * Batch form (lead finder import, bulk "WhatsApp OK"): records "they agreed" for
   * the lead finder contacts in the list that don't have an active agreement yet.
   * Other sources and already-permitted contacts are skipped. One query to pick
   * them, one insert for the records; audit entries go through the buffered log.
   */
  async recordForContacts(
    orgId: string,
    userId: string,
    contactIds: string[],
    dto: RecordWhatsAppPermissionDto,
    opts: { via: 'lead_finder_import' | 'bulk'; scrapeRunId?: string; ipAddress?: string; userAgent?: string | string[] },
  ): Promise<{ recorded: number; skipped: number }> {
    const unique = [...new Set(contactIds)];
    const ids = await this.permission.idsNeedingConsent(orgId, unique);
    if (!ids.length) return { recorded: 0, skipped: unique.length };
    const note = dto.note?.trim() || null;
    const runRef = opts.scrapeRunId ? { scrapeRunId: opts.scrapeRunId } : {};

    const recorded = await this.contactRepository.createConsentRecords(
      ids.map((contactId) => ({
        orgId,
        contactId,
        consentType: WHATSAPP_CONSENT_TYPE,
        source: dto.how,
        ipAddress: opts.ipAddress,
        metadata: { recordedBy: userId, note, ...runRef },
      })),
    );

    this.logger.log(`WhatsApp permission recorded for ${recorded} contacts (${dto.how}, ${opts.via})`);

    const userAgent = Array.isArray(opts.userAgent) ? opts.userAgent[0] : opts.userAgent;
    await Promise.all(
      ids.map((contactId) =>
        this.auditService.log({
          orgId,
          userId,
          action: AuditAction.CONTACT_UPDATED,
          targetType: 'Contact',
          targetId: contactId,
          metadata: { change: 'whatsapp_permission_recorded', how: dto.how, note, via: opts.via, ...runRef },
          ipAddress: opts.ipAddress,
          userAgent,
        }),
      ),
    );

    return { recorded, skipped: unique.length - recorded };
  }

  async revoke(
    contactId: string,
    orgId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string | string[],
  ): Promise<WhatsAppPermissionView> {
    const contact = await this.loadContact(contactId, orgId);
    const revoked = await this.contactRepository.revokeConsentRecords(orgId, contactId, WHATSAPP_CONSENT_TYPE);

    // Idempotent: nothing to revoke → no audit entry
    if (revoked > 0) {
      this.logger.log(`WhatsApp permission revoked for contact ${contactId}`);
      await this.auditService.log({
        orgId,
        userId,
        action: AuditAction.CONTACT_UPDATED,
        targetType: 'Contact',
        targetId: contactId,
        metadata: { change: 'whatsapp_permission_revoked', revoked },
        ipAddress,
        userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
      });
    }

    return this.view(contact, orgId);
  }

  private async loadContact(contactId: string, orgId: string): Promise<Contact> {
    const contact = await this.contactRepository.findByIdAndOrg(contactId, orgId);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  private async view(contact: Contact, orgId: string): Promise<WhatsAppPermissionView> {
    const [status, active] = await Promise.all([
      this.permission.getStatus(orgId, contact),
      this.permission.findActiveConsent(orgId, contact.id),
    ]);
    const meta = (active?.metadata ?? {}) as { recordedBy?: string; note?: string | null };
    return {
      contactId: contact.id,
      required: this.permission.requiresPermission(contact.source),
      status,
      agreement: active
        ? {
            id: active.id,
            how: active.source,
            note: meta.note ?? null,
            recordedBy: meta.recordedBy ?? null,
            grantedAt: active.grantedAt,
          }
        : null,
    };
  }
}
