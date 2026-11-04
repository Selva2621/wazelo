import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, WidgetSession } from '@prisma/client';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { WidgetRepository } from '../../infrastructure/repositories/widget.repository';
import { WebsiteChatRepository } from '../../infrastructure/repositories/website-chat.repository';
import { WebsiteHandoffService } from '../services/website-handoff.service';
import { WidgetLeadsService, normalizeVisitorPhone } from '../services/widget-leads.service';
import { WebsiteLeadDecisionDto, WidgetStartDto } from '../dto/website-chat.dto';
import { CHAT_EVENT, CHAT_STATE, CONSENT_THANKS, consentText, normalizeEmail } from '../../domain/services/website-chat';

/** A chat can begin only once the visitor gave all three */
export function hasDetails(s: Pick<WidgetSession, 'visitorName' | 'visitorPhone' | 'visitorEmail'>): boolean {
  return !!s.visitorName?.trim() && !!normalizeVisitorPhone(s.visitorPhone) && !!normalizeEmail(s.visitorEmail);
}

/**
 * What a website visitor can do besides chatting — fill in the form that starts the
 * chat, agree to be contacted, ask for a person, leave — and the team member's
 * "lead or not" decision at the end.
 */
@Injectable()
export class WebsiteChatUseCase {
  constructor(
    private readonly widgets: WidgetRepository,
    private readonly chats: WebsiteChatRepository,
    private readonly handoff: WebsiteHandoffService,
    private readonly leads: WidgetLeadsService,
    private readonly audit: AuditService,
  ) {}

  // ── Visitor ─────────────────────────────────────────────────────────────────

  /**
   * The form before the chat: first name, mobile and email are required. With the
   * consent box ticked the visitor is saved as a contact now; their welcome goes
   * when the chat ends. Unticked: a website chat only.
   */
  async start(orgSlug: string, dto: WidgetStartDto, ip?: string) {
    const name = dto.firstName.trim();
    const phone = normalizeVisitorPhone(dto.phone);
    const email = normalizeEmail(dto.email);
    if (!name) throw new BadRequestException('Enter your first name');
    if (!phone) throw new BadRequestException('Enter a valid mobile number with country code');
    if (!email) throw new BadRequestException('Enter a valid email address');

    const { orgId, session } = await this.visitorSession(orgSlug, dto.visitorId);
    if (session.state === CHAT_STATE.ENDED) await this.reopen(orgId, session.id);
    await this.chats.saveDetails(session.id, orgId, { name, phone, email, pageUrl: dto.pageUrl });
    await this.handoff.record(orgId, session.id, CHAT_EVENT.STARTED, { type: 'visitor' }, { consent: dto.consent, pageUrl: dto.pageUrl ?? null });
    if (dto.consent) await this.giveConsent(orgId, session.id, ip);
    await this.handoff.scheduleIdleCheck(orgId, session.id);
    this.handoff.activity(orgId, session.id);
    return { sessionId: session.id, chat: await this.visitorState(orgId, session.id) };
  }

  /**
   * Later in the chat, when nobody could take it: the visitor taps "Yes, contact me".
   * They're saved as a contact and the chat ends with a thank-you (their welcome goes now).
   */
  async consent(orgSlug: string, visitorId: string, ip?: string) {
    const { orgId, session } = await this.visitorSession(orgSlug, visitorId);
    if (!hasDetails(session)) throw new BadRequestException('Fill in your details first');
    await this.giveConsent(orgId, session.id, ip);
    const message = await this.handoff.say(orgId, session.id, CONSENT_THANKS);
    await this.handoff.end(orgId, session.id, { type: 'visitor' }, 'CONSENT');
    return { message, chat: await this.visitorState(orgId, session.id) };
  }

  /** The widget's "Talk to a person" button */
  async askForPerson(orgSlug: string, visitorId: string) {
    const { orgId, session } = await this.visitorSession(orgSlug, visitorId);
    if (!hasDetails(session)) throw new BadRequestException('Fill in your details to start the chat');
    if (session.state === CHAT_STATE.ENDED) await this.reopen(orgId, session.id);
    const outcome = await this.handoff.request(orgId, session.id, 'BUTTON');
    return { ...outcome, chat: await this.visitorState(orgId, session.id) };
  }

  /** The visitor closes the conversation */
  async endByVisitor(orgSlug: string, visitorId: string) {
    const { orgId, session } = await this.visitorSession(orgSlug, visitorId);
    await this.handoff.end(orgId, session.id, { type: 'visitor' }, 'VISITOR');
    return { chat: await this.visitorState(orgId, session.id) };
  }

  /** For the widget: who is answering, whether the form is still needed, and whether to offer "Yes, contact me" */
  async visitorState(orgId: string, sessionId: string) {
    const session = await this.chats.findSession(sessionId, orgId);
    if (!session) return null;
    const agent = session.state === CHAT_STATE.PERSON && session.assignedToId ? await this.chats.member(session.assignedToId, orgId) : null;
    return {
      state: session.state,
      needsDetails: !hasDetails(session),
      agentName: agent?.firstName ?? null,
      consentGiven: !!session.consentAt,
      offerFollowUp:
        session.state === CHAT_STATE.WAITING && !session.consentAt && (await this.followUpOffered(sessionId, orgId, session.handoffRequestedAt)),
    };
  }

  async reopen(orgId: string, sessionId: string) {
    if (await this.chats.reopen(sessionId, orgId)) {
      await this.handoff.record(orgId, sessionId, CHAT_EVENT.REOPENED, { type: 'visitor' });
    }
  }

  /** Saves the consent and the contact (its welcome waits for the chat to end). Every step is on the timeline. */
  private async giveConsent(orgId: string, sessionId: string, ip?: string) {
    const fresh = await this.chats.saveConsent(sessionId, orgId, 'BOTH');
    if (!fresh) return; // already agreed in this chat
    const session = (await this.chats.findSession(sessionId, orgId))!;
    const text = consentText(await this.chats.businessName(orgId));
    await this.handoff.record(orgId, sessionId, CHAT_EVENT.CONSENT_GIVEN, { type: 'visitor' }, { text, ip: ip ?? null });
    void this.audit.log({
      orgId,
      action: AuditAction.WIDGET_CONSENT_GIVEN,
      targetType: 'WidgetSession',
      targetId: sessionId,
      metadata: { channels: ['WHATSAPP', 'EMAIL'] },
      ipAddress: ip,
    });

    const phone = normalizeVisitorPhone(session.visitorPhone);
    if (!phone) {
      await this.handoff.recordFailure(orgId, sessionId, 'create-contact', new Error('No valid mobile number on the chat'));
      return;
    }
    try {
      const lead = await this.leads.capture({
        orgId,
        sessionId,
        phone,
        email: normalizeEmail(session.visitorEmail),
        name: session.visitorName,
        consentText: text,
        ipAddress: ip,
      });
      if (!lead) {
        await this.handoff.recordFailure(orgId, sessionId, 'create-contact', new Error('The workspace has no admin to own the contact'));
        return;
      }
      // A new contact's welcome waits until the chat ends; an existing contact gets no second welcome
      await this.chats.linkContact(sessionId, orgId, lead.contactId, lead.created);
      await this.handoff.record(orgId, sessionId, lead.created ? CHAT_EVENT.CONTACT_CREATED : CHAT_EVENT.CONTACT_LINKED, { type: 'system' }, {
        contactId: lead.contactId,
        welcome: lead.created ? 'when the chat ends' : 'not sent (existing contact)',
      });
    } catch (err) {
      // The visitor's chat goes on; the failure is on the chat's timeline and in the server log
      await this.handoff.recordFailure(orgId, sessionId, 'create-contact', err);
    }
  }

  // ── Team ────────────────────────────────────────────────────────────────────

  /** The member decides whether the visitor becomes a lead. Once per chat. */
  async decideLead(orgId: string, sessionId: string, userId: string, dto: WebsiteLeadDecisionDto) {
    const session = await this.chats.findSession(sessionId, orgId);
    if (!session) throw new NotFoundException('Chat not found');
    if (session.leadDecision) throw new ConflictException(session.leadDecision === 'LEAD' ? 'Already saved as a lead' : 'Already marked as not a lead');

    if (dto.decision === 'NOT_LEAD') {
      await this.chats.decideLead(sessionId, orgId, 'NOT_LEAD');
      await this.handoff.record(orgId, sessionId, CHAT_EVENT.LEAD_DISMISSED, { type: 'user', id: userId });
      void this.audit.log({ orgId, userId, action: AuditAction.WIDGET_LEAD_DISMISSED, targetType: 'WidgetSession', targetId: sessionId });
      return { decision: 'NOT_LEAD' as const, contactId: null };
    }

    const phone = normalizeVisitorPhone(dto.phone ?? session.visitorPhone);
    if (!phone) throw new BadRequestException("Add the visitor's mobile number to save them as a lead");
    // Claimed before creating, so two clicks can't make two leads
    if (!(await this.chats.decideLead(sessionId, orgId, 'LEAD'))) throw new ConflictException('Already decided');

    let lead: { contactId: string; created: boolean };
    try {
      lead = session.contactId
        ? { contactId: session.contactId, created: false }
        : await this.leads.saveWithoutConsent({
            orgId,
            sessionId,
            phone,
            email: normalizeEmail(session.visitorEmail),
            name: dto.name ?? session.visitorName,
            userId,
          });
    } catch (err) {
      await this.handoff.recordFailure(orgId, sessionId, 'save-lead', err);
      throw err;
    }

    const consented = !!session.consentAt;
    if (!session.contactId) await this.chats.linkContact(sessionId, orgId, lead.contactId);
    await this.handoff.record(orgId, sessionId, CHAT_EVENT.LEAD_SAVED, { type: 'user', id: userId }, {
      contactId: lead.contactId,
      created: lead.created,
      consent: consented,
      automations: consented ? 'welcome when the chat ends' : 'off (no consent)',
    });
    void this.audit.log({
      orgId,
      userId,
      action: AuditAction.WIDGET_LEAD_SAVED,
      targetType: 'WidgetSession',
      targetId: sessionId,
      metadata: { contactId: lead.contactId, consent: consented },
    });
    return { decision: 'LEAD' as const, contactId: lead.contactId, consent: consented };
  }

  async timeline(orgId: string, sessionId: string) {
    const session = await this.chats.findSession(sessionId, orgId);
    if (!session) throw new NotFoundException('Chat not found');
    const events = await this.chats.timeline(sessionId, orgId);
    // Names for the people in it
    const ids = [...new Set(events.map((e) => e.actorId).filter((id): id is string => !!id))];
    const people = await Promise.all(ids.map((id) => this.chats.member(id, orgId)));
    const names = new Map(people.filter(Boolean).map((p) => [p!.id, `${p!.firstName} ${p!.lastName}`.trim()]));
    return events.map((e) => ({ ...e, actorName: e.actorId ? names.get(e.actorId) ?? null : null }));
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async visitorSession(orgSlug: string, visitorId: string) {
    const orgId = await this.widgets.findOrgIdBySlug(orgSlug);
    if (!orgId) throw new NotFoundException('Widget not found');
    const config = await this.widgets.findConfigByOrgId(orgId);
    if (!config?.enabled) throw new NotFoundException('Widget not found or disabled');
    const session = await this.widgets.findOrCreateSession({ orgId, visitorId });
    return { orgId, session };
  }

  private async followUpOffered(sessionId: string, orgId: string, since: Date | null) {
    const events = await this.chats.timeline(sessionId, orgId);
    return events.some((e) => e.type === CHAT_EVENT.FOLLOW_UP_OFFERED && (!since || e.createdAt >= since));
  }
}
