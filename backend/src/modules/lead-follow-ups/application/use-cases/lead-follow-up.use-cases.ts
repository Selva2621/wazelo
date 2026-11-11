import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import type { LeadAssignedEvent, LeadDailySummaryEvent, LeadFollowUpDueEvent, LeadProductInterestEvent } from '@/events/event-bus';
import { LeadFollowUpRepository, type TouchVia } from '../../infrastructure/repositories/lead-follow-up.repository';
import { pickAssignee } from '../../domain/services/pick-assignee';
import { buildDailySummary, formatDailySummary, localDay } from '../../domain/services/daily-summary';

/**
 * A lead asked about a product: give it to the product's team member with the
 * fewest leads waiting, set the reminder time, and tell them.
 * Products without a team keep today's behaviour (the contact's owner, if any).
 */
@Injectable()
export class AssignLeadUseCase {
  private readonly logger = new Logger(AssignLeadUseCase.name);

  constructor(
    private readonly repo: LeadFollowUpRepository,
    private readonly events: EventEmitter2,
  ) {}

  async execute(event: LeadProductInterestEvent): Promise<void> {
    const product = await this.repo.findProduct(event.productId, event.orgId);
    const contact = await this.repo.findContact(event.contactId, event.orgId);
    if (!product || !contact) return;

    const team = await this.repo.activeUserIds(event.orgId, product.leadHandlerIds ?? []);
    // No team set: the contact's owner still gets a reminder
    const assigneeId = team.length > 0
      ? pickAssignee(team, await this.repo.loads(event.orgId, team))
      : contact.ownerId;
    if (!assigneeId) return;

    const reminderMinutes = product.leadReminderMinutes ?? 30;
    const { followUp, created } = await this.repo.create({
      orgId: event.orgId,
      contactId: contact.id,
      productId: product.id,
      assigneeId,
      leadgenId: event.leadgenId,
      dueAt: new Date(Date.now() + reminderMinutes * 60_000),
    });
    if (!created) return;

    // A brand-new contact belongs to whoever handles its first lead
    if (event.isNewContact && team.length > 0 && contact.ownerId !== assigneeId) {
      await this.repo.setContactOwner(contact.id, assigneeId);
    }

    const assigned: LeadAssignedEvent = {
      orgId: event.orgId,
      followUpId: followUp.id,
      contactId: contact.id,
      assigneeId,
      contactName: contact.name,
      contactPhone: contact.phoneNumber,
      productName: product.name,
      reminderMinutes,
    };
    this.events.emit(EVENT_NAMES.LEAD_ASSIGNED, assigned);
    this.logger.log(`Lead ${followUp.id} (${product.name}) assigned to ${assigneeId}`);
  }
}

/** Someone contacted a lead: by message, a status change or "Called" */
@Injectable()
export class TouchLeadUseCase {
  constructor(private readonly repo: LeadFollowUpRepository) {}

  byContact(orgId: string, contactId: string, userId: string | null, via: TouchVia) {
    return this.repo.touchContact(orgId, contactId, userId, via);
  }

  async byConversation(orgId: string, conversationId: string, userId: string) {
    const contactId = await this.repo.contactIdForConversation(orgId, conversationId);
    if (!contactId) return 0;
    return this.repo.touchContact(orgId, contactId, userId, 'MESSAGE');
  }

  /** The one-click "Called" from the lead list: its assignee, or an admin/manager */
  async called(orgId: string, followUpId: string, userId: string, role: string) {
    const followUp = await this.repo.findById(followUpId, orgId);
    if (!followUp) throw new NotFoundException('Lead not found');
    if (followUp.assigneeId !== userId && role !== 'ADMIN' && role !== 'MANAGER') {
      throw new ForbiddenException('This lead is assigned to someone else');
    }
    await this.repo.touchContact(orgId, followUp.contactId, userId, 'CALLED');
    return { success: true };
  }
}

/** A person's leads still waiting for contact */
@Injectable()
export class ListMyLeadsUseCase {
  constructor(private readonly repo: LeadFollowUpRepository) {}

  async execute(orgId: string, userId: string) {
    const rows = await this.repo.findOpenForAssignee(orgId, userId);
    return rows.map((r) => ({
      id: r.id,
      contactId: r.contact.id,
      contactName: r.contact.name,
      contactPhone: r.contact.phoneNumber,
      productId: r.product?.id ?? null,
      productName: r.product?.name ?? null,
      assignedAt: r.createdAt,
      dueAt: r.dueAt,
      overdue: r.dueAt.getTime() <= Date.now(),
    }));
  }
}

/** Local hour (org time zone) after which the day's summary goes out */
export const SUMMARY_HOUR = 19;

/**
 * Once a day, after 7 PM in the org's time zone, send each brand's manager a summary
 * of the brand's leads: how many, contacted (on time), and who is still waiting.
 */
@Injectable()
export class SendDailySummariesUseCase {
  private readonly logger = new Logger(SendDailySummariesUseCase.name);

  constructor(
    private readonly repo: LeadFollowUpRepository,
    private readonly events: EventEmitter2,
  ) {}

  async execute(now = new Date()): Promise<number> {
    const brands = await this.repo.findBrandsWithManagers();
    let sent = 0;
    for (const brand of brands) {
      try {
        const day = localDay(now, brand.organization.timezone || 'UTC');
        if (day.hour < SUMMARY_HOUR || brand.lastSummaryDate === day.date) continue;
        const leads = await this.repo.leadsForBrand(brand.orgId, brand.id, day.startOfDay, now);
        await this.repo.markSummarySent(brand.id, day.date);
        // A quiet day: no message
        if (leads.length === 0) continue;
        const summary = buildDailySummary(leads);
        const { title, body } = formatDailySummary(brand.name, summary);
        const event: LeadDailySummaryEvent = {
          orgId: brand.orgId,
          brandId: brand.id,
          managerId: brand.managerId!,
          date: day.date,
          title,
          body,
        };
        this.events.emit(EVENT_NAMES.LEAD_DAILY_SUMMARY, event);
        sent++;
      } catch (error) {
        this.logger.error(`Day-end summary failed for brand ${brand.id}: ${(error as Error).message}`);
      }
    }
    if (sent) this.logger.log(`Sent ${sent} brand day-end lead summar${sent === 1 ? 'y' : 'ies'}`);
    return sent;
  }
}

/** Remind each assignee once when a lead's time passes without contact */
@Injectable()
export class RemindDueLeadsUseCase {
  private readonly logger = new Logger(RemindDueLeadsUseCase.name);

  constructor(
    private readonly repo: LeadFollowUpRepository,
    private readonly events: EventEmitter2,
  ) {}

  async execute(now = new Date()): Promise<number> {
    const due = await this.repo.findDueToRemind(now);
    for (const f of due) {
      try {
        await this.repo.markReminded(f.id);
        const event: LeadFollowUpDueEvent = {
          orgId: f.orgId,
          followUpId: f.id,
          contactId: f.contact.id,
          assigneeId: f.assigneeId,
          contactName: f.contact.name,
          contactPhone: f.contact.phoneNumber,
          productName: f.product?.name ?? null,
          waitingMinutes: Math.max(1, Math.round((now.getTime() - f.createdAt.getTime()) / 60_000)),
        };
        this.events.emit(EVENT_NAMES.LEAD_FOLLOW_UP_DUE, event);
      } catch (error) {
        this.logger.error(`Lead reminder failed for ${f.id}: ${(error as Error).message}`);
      }
    }
    if (due.length) this.logger.log(`Reminded about ${due.length} lead(s) not contacted yet`);
    return due.length;
  }
}
