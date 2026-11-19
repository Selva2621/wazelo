import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DealStatus, MessageType, ProposalStatus } from '@prisma/client';
import { ProposalPdfUseCase } from './proposal-pdf.use-case';
import { EVENT_NAMES } from '@/common/constants';
import { OutboundMessageService } from '@/modules/messages/application/services/outbound-message.service';
import { ConversationRepository } from '@/modules/messages/infrastructure/repositories/conversation.repository';
import { DealLifecycleUseCase } from '@/modules/deals/application/use-cases/deal-lifecycle.use-case';
import { ProposalRepository, ProposalWithPeople } from '../../infrastructure/repositories/proposal.repository';
import { cleanItems, computeTotals, proposalNumber } from '../../domain/services/proposal-math';
import { publicProposalUrl } from '../proposal-view';
import { ManageProposalsUseCase } from './manage-proposals.use-case';

/** ₹35,400 / $1,200.50 — the client's WhatsApp shows this as-is. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** The WhatsApp message that carries the link. */
export function proposalMessage(p: {
  clientName: string | null;
  title: string;
  total: number;
  currency: string;
  hasTax: boolean;
  validUntil: Date | null;
  url: string;
}): string {
  const first = p.clientName?.trim().split(/\s+/)[0];
  const valid = p.validUntil
    ? `\nValid till ${p.validUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';
  return [
    `Hi${first ? ` ${first}` : ''}, here's our proposal for *${p.title}*.`,
    '',
    `Total: *${formatMoney(p.total, p.currency)}*${p.hasTax ? ' (incl. tax)' : ''}${valid}`,
    '',
    `View, accept or ask for changes here:\n${p.url}`,
  ].join('\n');
}

/** Sends (or re-sends) the proposal link on WhatsApp and moves the deal to its proposal stage. */
@Injectable()
export class SendProposalUseCase {
  private readonly logger = new Logger(SendProposalUseCase.name);

  constructor(
    private readonly repo: ProposalRepository,
    private readonly manage: ManageProposalsUseCase,
    private readonly outbound: OutboundMessageService,
    private readonly conversations: ConversationRepository,
    private readonly dealLifecycle: DealLifecycleUseCase,
    private readonly events: EventEmitter2,
    private readonly pdf: ProposalPdfUseCase,
  ) {}

  /** POST /proposals/:id/share — for sending the link yourself: marks it sent so the link opens. */
  async share(orgId: string, id: string) {
    const p = await this.manage.find(orgId, id);
    this.assertSendable(p);
    await this.markSent(p);
    return this.manage.get(orgId, id);
  }

  async execute(orgId: string, userId: string, id: string) {
    const p = await this.manage.find(orgId, id);
    const totals = this.assertSendable(p);

    const session = await this.repo.connectedSession(orgId, userId);
    if (!session) throw new BadRequestException('Connect WhatsApp first');

    const phone = p.contact.phoneNumber;
    const conversation = await this.conversations.findOrCreate({ orgId, sessionId: session.id, contactPhone: phone });
    const body = proposalMessage({
      clientName: p.contact.name,
      title: p.title,
      total: totals.total,
      currency: p.currency,
      hasTax: totals.tax > 0,
      validUntil: p.validUntil,
      url: publicProposalUrl(this.manage.frontendUrl, p.publicToken),
    });
    await this.outbound.send({
      orgId,
      sessionId: session.id,
      conversationId: conversation.id,
      contactPhone: phone,
      contactId: p.contact.id,
      contactName: p.contact.name ?? undefined,
      body,
      metadata: { proposalId: p.id, source: 'proposal' },
    });
    // The PDF follows the link as a file; if it can't be made, the link alone still works
    try {
      const file = await this.pdf.saveForWhatsApp(p);
      await this.outbound.send({
        orgId,
        sessionId: session.id,
        conversationId: conversation.id,
        contactPhone: phone,
        contactId: p.contact.id,
        contactName: p.contact.name ?? undefined,
        type: MessageType.DOCUMENT,
        mediaUrl: file.url,
        body: file.fileName,
        metadata: { proposalId: p.id, source: 'proposal' },
      });
    } catch (err) {
      this.logger.warn(`Proposal ${p.id}: PDF not attached (${(err as Error).message})`);
    }

    await this.markSent(p);
    // A person sent this: the AI bot leaves the chat to them for a while
    this.events.emit(EVENT_NAMES.CONVERSATION_AGENT_REPLIED, { orgId, conversationId: conversation.id, userId });
    this.logger.log(`Proposal ${proposalNumber(p.number)} sent to ${phone} (org ${orgId})`);
    return this.manage.get(orgId, id);
  }

  private assertSendable(p: ProposalWithPeople) {
    if (p.status === ProposalStatus.ACCEPTED) throw new BadRequestException('This proposal was already accepted');
    const items = cleanItems(p.items);
    const totals = computeTotals(items, Number(p.taxPercent), Number(p.discount));
    if (!items.length) throw new BadRequestException('Add at least one item before sending');
    if (totals.total <= 0) throw new BadRequestException('Add prices before sending');
    return totals;
  }

  /** Sent (again): a draft or a changed proposal goes back to waiting for the client. */
  private async markSent(p: ProposalWithPeople) {
    const firstSend = p.status === ProposalStatus.DRAFT || p.status === ProposalStatus.CHANGES_REQUESTED;
    await this.repo.update(p.id, {
      sentAt: new Date(),
      ...(firstSend && { status: ProposalStatus.SENT, respondedAt: null }),
    });
    if (p.deal?.status === DealStatus.OPEN) {
      await this.moveDealToProposalStage(p.deal).catch((err) =>
        this.logger.warn(`Couldn't move deal ${p.deal!.id} to its proposal stage: ${(err as Error).message}`),
      );
    }
  }

  /** Into the pipeline's "Proposal"/"Quote" stage, if the deal isn't past it already. */
  private async moveDealToProposalStage(deal: { id: string; pipelineId: string; stageId: string; status: DealStatus }) {
    const stages = await this.repo.stagesOf(deal.pipelineId);
    const target = stages.find((s) => !s.isWonStage && !s.isLostStage && /proposal|quote|quotation/i.test(s.name));
    const current = stages.find((s) => s.id === deal.stageId);
    if (!target || !current || target.order <= current.order) return;
    await this.dealLifecycle.moveToStage(deal, target.id);
  }
}
