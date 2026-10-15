import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlatformAuditAction } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import { OrgStatusService } from '@/modules/org/domain/services/org-status.service';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';
import { PlatformAuditService } from '../services/platform-audit.service';
import { AdminActionContext } from './org-management.use-cases';
import { diffChanges } from '../../domain/services/audit-diff';
import {
  canRestore,
  confirmsOrgName,
  isValidTimeZone,
  ORG_RESTORE_WINDOW_DAYS,
  restoreDeadline,
} from '../../domain/services/org-lifecycle';

const EXPORT_CONTACT_LIMIT = 100_000;

/** Edit an org's name, slug or time zone. */
@Injectable()
export class AdminUpdateOrgUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(orgId: string, input: { name?: string; slug?: string; timezone?: string }, ctx: AdminActionContext) {
    const org = await this.platformRepo.findOrgAnyState(orgId);
    if (!org || org.deletedAt) throw new NotFoundException('Organization not found');
    if (input.timezone !== undefined && !isValidTimeZone(input.timezone)) {
      throw new BadRequestException('Unknown time zone — use an IANA name such as Asia/Kolkata');
    }
    if (input.slug !== undefined && input.slug !== org.slug && (await this.platformRepo.slugTaken(input.slug, orgId))) {
      throw new ConflictException('That slug is already used by another organization');
    }
    const diff = diffChanges(org as unknown as Record<string, unknown>, { ...input });
    if (Object.keys(diff.after).length === 0) return { org };

    const updated = await this.platformRepo.updateOrgIdentity(orgId, input);
    await this.audit.record({
      action: PlatformAuditAction.ORG_UPDATED,
      actor: ctx.actor,
      targetType: 'Organization',
      targetId: orgId,
      orgId,
      metadata: { orgName: org.name, ...diff },
      meta: ctx.meta,
    });
    return { org: updated };
  }
}

/**
 * Soft-deletes an org: its users are locked out (like a suspension), sessions and sockets
 * are cut, and a live subscription is cancelled so it is never billed again. Restorable for
 * 30 days. The subscription is NOT revived on restore.
 */
@Injectable()
export class AdminDeleteOrgUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly orgStatus: OrgStatusService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(orgId: string, confirmName: string, reason: string, ctx: AdminActionContext) {
    const org = await this.platformRepo.findOrgAnyState(orgId);
    if (!org || org.deletedAt) throw new NotFoundException('Organization not found');
    if (!confirmsOrgName(confirmName, org.name)) {
      throw new BadRequestException('Type the organization name exactly to confirm');
    }

    const result = await this.platformRepo.softDeleteOrg(orgId, reason, ctx.actor.id);
    this.orgStatus.invalidate(orgId);
    // The socket gateway disconnects the org's clients on this event
    this.eventEmitter.emit(EVENT_NAMES.ORG_SUSPENDED, { orgId, reason: 'Organization deleted' });

    await this.audit.record({
      action: PlatformAuditAction.ORG_DELETED,
      actor: ctx.actor,
      targetType: 'Organization',
      targetId: orgId,
      orgId,
      metadata: { orgName: org.name, slug: org.slug, reason, ...result },
      meta: ctx.meta,
    });
    return { deleted: true, restorableUntil: restoreDeadline(new Date()), ...result };
  }
}

@Injectable()
export class AdminRestoreOrgUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly orgStatus: OrgStatusService,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(orgId: string, ctx: AdminActionContext) {
    const org = await this.platformRepo.findOrgAnyState(orgId);
    if (!org) throw new NotFoundException('Organization not found');
    if (!org.deletedAt) throw new BadRequestException('This organization is not deleted');
    if (!canRestore(org.deletedAt)) {
      throw new BadRequestException(`Organizations can only be restored within ${ORG_RESTORE_WINDOW_DAYS} days of deletion`);
    }
    await this.platformRepo.restoreOrg(orgId);
    this.orgStatus.invalidate(orgId);
    await this.audit.record({
      action: PlatformAuditAction.ORG_RESTORED,
      actor: ctx.actor,
      targetType: 'Organization',
      targetId: orgId,
      orgId,
      metadata: { orgName: org.name, deletedAt: org.deletedAt.toISOString() },
      meta: ctx.meta,
    });
    return { restored: true };
  }
}

/** A JSON copy of an org's data (no credentials, no message content), audited. */
@Injectable()
export class AdminExportOrgUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(orgId: string, ctx: AdminActionContext) {
    const org = await this.platformRepo.findOrgAnyState(orgId);
    if (!org) throw new NotFoundException('Organization not found');
    const data = await this.platformRepo.orgExportData(orgId, EXPORT_CONTACT_LIMIT);
    const contactsTruncated = data.contactTotal > data.contacts.length;

    await this.audit.record({
      action: PlatformAuditAction.ORG_EXPORTED,
      actor: ctx.actor,
      targetType: 'Organization',
      targetId: orgId,
      orgId,
      metadata: {
        orgName: org.name,
        users: data.users.length,
        contacts: data.contacts.length,
        contactsTruncated,
      },
      meta: ctx.meta,
    });
    return {
      exportedAt: new Date().toISOString(),
      exportedBy: ctx.actor.email ?? ctx.actor.id,
      note: 'Message content is not included; see counts. No passwords or credentials are exported.',
      ...data,
      contactsTruncated,
    };
  }
}
