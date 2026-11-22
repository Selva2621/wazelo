import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContactSource, SubscriptionStatus } from '@prisma/client';
import { diffSegmentTags, segmentTags } from '../../domain/services/platform-alerts';
import { EVENT_NAMES } from '@/common/constants';
import type { ContactCreatedEvent } from '@/events/event-bus';
import { ContactRepository } from '@/modules/contacts/infrastructure/repositories/contact.repository';
import { DealLifecycleUseCase } from '@/modules/deals/application/use-cases/deal-lifecycle.use-case';
import { LeadAssignmentService } from '@/modules/lead-ads/domain/services/lead-assignment.service';
import { NotificationDispatchService } from '@/modules/notifications/domain/services/notification-dispatch.service';
import { HqLeadsRepository } from '../../infrastructure/repositories/hq-leads.repository';
import {
  SIGNUP_TAG,
  SignupStage,
  signupDealTitle,
  signupName,
  signupStage,
  stageName,
} from '../../domain/services/signup-lead';

/**
 * Wazelo's own CRM: sign-ups become Wazelo HQ leads.
 *
 * - `fromSignup(userId)` — someone signed up (or added their WhatsApp number later):
 *   HQ contact + consent, a deal in "Wazelo customers", the HQ team notified, and —
 *   only with their WhatsApp consent — HQ's "contact created" automations (the welcome).
 * - `fromSubscription(orgId)` — their trial / payment / cancellation changed: the deal
 *   moves to the matching stage.
 *
 * Both recompute from the database, so replays and out-of-order events are harmless.
 * No HQ yet, no phone number, or HQ's own users: nothing happens.
 */
@Injectable()
export class SyncSignupLeadUseCase {
  private readonly logger = new Logger(SyncSignupLeadUseCase.name);

  constructor(
    private readonly repo: HqLeadsRepository,
    private readonly contacts: ContactRepository,
    private readonly deals: DealLifecycleUseCase,
    private readonly assignment: LeadAssignmentService,
    private readonly notifications: NotificationDispatchService,
    private readonly events: EventEmitter2,
  ) {}

  async fromSignup(userId: string): Promise<void> {
    const hqId = await this.repo.findHqId();
    if (!hqId) return;

    const signup = await this.repo.findSignup(userId);
    if (!signup || !signup.phone || signup.superAdminId || signup.organization.isInternal) return;

    const name = signupName(signup);
    const orgName = signup.organization.name;
    const sub = await this.repo.latestSubscription(signup.orgId);
    const plan = sub?.plan.name ?? null;

    const ownerId = await this.assignment.assignOwner(hqId);
    const { contact, created } = await this.contacts.upsertByPhone(
      { orgId: hqId, phoneNumber: signup.phone, name, email: signup.email, source: ContactSource.SIGNUP, ownerId },
      ownerId,
    );
    await this.repo.linkContact(contact.id, { customerOrgId: signup.orgId, customerUserId: signup.id, orgName, plan }, signup.email);
    const tag = await this.contacts.findOrCreateTag(hqId, SIGNUP_TAG);
    await this.contacts.addTagToContact(contact.id, tag.id, hqId, ownerId);
    if (signup.whatsappOptInAt) await this.repo.recordConsent(hqId, contact.id, signup.whatsappOptInAt);

    const title = signupDealTitle(name, orgName);
    let deal = await this.placeDeal(hqId, contact.id, contact.ownerId, title, signupStage(sub));
    // The trial is assigned by a parallel job: if it landed while this ran, its event found no
    // deal to move yet — look once more now that the deal exists
    const latest = await this.repo.latestSubscription(signup.orgId);
    if (signupStage(latest) !== signupStage(sub)) {
      deal = await this.placeDeal(hqId, contact.id, contact.ownerId, title, signupStage(latest));
      await this.repo.updatePlan(contact.id, latest?.plan.name ?? null);
    }
    await this.syncSegmentTags(hqId, contact.id, ownerId, signup.orgId, latest);

    if (created) {
      await this.notifications.dispatchToOrg(
        hqId,
        await this.repo.findTeamIds(hqId),
        'LEAD_ASSIGNED',
        'HIGH',
        `New sign-up: ${name}`,
        `${orgName}${plan ? ` · ${plan}` : ''}${signup.whatsappOptInAt ? '' : ' · no WhatsApp consent'}`,
        { contactId: contact.id, dealId: deal?.id, phoneNumber: signup.phone },
        `hq-signup:${signup.orgId}`,
      );

      // The welcome goes out through HQ's own automations — only to people who agreed
      if (signup.whatsappOptInAt) {
        this.events.emit(EVENT_NAMES.CONTACT_CREATED, {
          contactId: contact.id,
          orgId: hqId,
          phoneNumber: signup.phone,
          ownerId: contact.ownerId,
          source: ContactSource.SIGNUP,
          createdById: contact.ownerId,
        } satisfies ContactCreatedEvent);
      }
    }
    this.logger.log(`Sign-up ${signup.orgId} → HQ contact ${contact.id} (${created ? 'new' : 'existing'})`);
  }

  async fromSubscription(customerOrgId: string): Promise<void> {
    const hqId = await this.repo.findHqId();
    if (!hqId || hqId === customerOrgId) return;

    // No HQ contact yet (e.g. a Google sign-up who hasn't given a number): nothing to move
    const contact = await this.repo.findContactForOrg(hqId, customerOrgId);
    if (!contact) return;

    const sub = await this.repo.latestSubscription(customerOrgId);
    await this.repo.updatePlan(contact.id, sub?.plan.name ?? null);
    // Move only: the deal is created by fromSignup (two creators racing would duplicate it)
    await this.placeDeal(hqId, contact.id, contact.ownerId, null, signupStage(sub));
    await this.syncSegmentTags(hqId, contact.id, contact.ownerId, customerOrgId, sub);
  }

  /** plan:/stage:/type: tags, so HQ campaigns and sequences can target customer segments */
  private async syncSegmentTags(
    hqId: string,
    contactId: string,
    actorId: string,
    customerOrgId: string,
    sub: { status: SubscriptionStatus; priceInCents: number; plan: { name: string } } | null,
  ) {
    const wanted = segmentTags({
      plan: sub?.plan.name ?? null,
      stage: signupStage(sub),
      orgType: await this.repo.findOrgType(customerOrgId),
    });
    const current = await this.repo.contactTagNames(contactId);
    const { add, remove } = diffSegmentTags(current.map((t) => t.name), wanted);
    for (const name of add) {
      const tag = await this.contacts.findOrCreateTag(hqId, name);
      await this.contacts.addTagToContact(contactId, tag.id, hqId, actorId);
    }
    for (const name of remove) {
      const tag = current.find((t) => t.name === name);
      if (tag) await this.contacts.removeTagFromContact(contactId, tag.id);
    }
  }

  /**
   * The contact's deal in "Wazelo customers", at `stage`: moved if it isn't there, created
   * if missing and a `title` is given (null = move only).
   */
  private async placeDeal(hqId: string, contactId: string, ownerId: string, title: string | null, stage: SignupStage) {
    const pipeline = await this.repo.ensureCustomerPipeline(hqId);
    const target = pipeline.stages.find((s) => s.name === stageName(stage)) ?? pipeline.stages[0];
    const existing = await this.repo.findDeal(hqId, pipeline.id, contactId);
    if (!existing) {
      if (title === null) return null;
      return this.deals.create({ orgId: hqId, pipelineId: pipeline.id, stageId: target.id, contactId, assignedToId: ownerId, title });
    }
    if (existing.stageId === target.id) return existing;
    return this.deals.moveToStage(existing, target.id);
  }
}
