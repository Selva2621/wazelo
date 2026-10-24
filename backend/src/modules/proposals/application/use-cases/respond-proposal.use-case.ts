import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DealStatus, ProposalStatus } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import { DealLifecycleUseCase } from '@/modules/deals/application/use-cases/deal-lifecycle.use-case';
import { ProposalRepository } from '../../infrastructure/repositories/proposal.repository';
import { cleanItems, cleanScope, computeTotals, isExpired, proposalNumber } from '../../domain/services/proposal-math';

const OPEN: ProposalStatus[] = [ProposalStatus.SENT, ProposalStatus.VIEWED];

export interface ProposalEvent {
  orgId: string;
  proposalId: string;
  number: string;
  title: string;
  contactId: string;
  contactName: string;
  dealId: string | null;
  userId: string;
  total: number;
  currency: string;
}

/**
 * The client's side of the public link: open (marks it viewed once), accept
 * (deal value = total, deal won), or ask for changes with a note.
 */
@Injectable()
export class RespondProposalUseCase {
  private readonly logger = new Logger(RespondProposalUseCase.name);

  constructor(
    private readonly repo: ProposalRepository,
    private readonly dealLifecycle: DealLifecycleUseCase,
    private readonly events: EventEmitter2,
  ) {}

  async view(token: string) {
    const p = await this.find(token);
    if (p.status === ProposalStatus.SENT && (await this.repo.transition(p.id, [ProposalStatus.SENT], { status: ProposalStatus.VIEWED, viewedAt: new Date() }))) {
      this.events.emit(EVENT_NAMES.PROPOSAL_VIEWED, this.event(p));
      p.status = ProposalStatus.VIEWED;
    }
    const items = cleanItems(p.items);
    const taxPercent = Number(p.taxPercent);
    return {
      number: proposalNumber(p.number),
      title: p.title,
      intro: p.intro,
      scope: cleanScope(p.scope),
      items,
      taxPercent,
      currency: p.currency,
      totals: computeTotals(items, taxPercent, Number(p.discount)),
      terms: p.terms,
      validUntil: p.validUntil,
      issuedAt: p.sentAt ?? p.createdAt,
      status: p.status,
      expired: isExpired(p),
      respondedAt: p.respondedAt,
      acceptedBy: p.acceptedBy,
      client: { name: p.contact.name },
      business: { name: p.organization.name, website: p.organization.website },
    };
  }

  async accept(token: string, name: string) {
    const p = await this.findOpen(token);
    const total = computeTotals(cleanItems(p.items), Number(p.taxPercent), Number(p.discount)).total;
    const done = await this.repo.transition(p.id, OPEN, {
      status: ProposalStatus.ACCEPTED,
      respondedAt: new Date(),
      acceptedBy: name.trim().slice(0, 200),
      responseNote: null,
    });
    if (!done) throw new ConflictException('This proposal was already answered');

    if (p.deal && p.deal.status === DealStatus.OPEN) {
      await this.dealLifecycle
        .update(p.deal, { value: total, currency: p.currency, status: DealStatus.WON })
        .catch((err) => this.logger.warn(`Proposal accepted but deal ${p.deal!.id} not updated: ${(err as Error).message}`));
    }
    this.events.emit(EVENT_NAMES.PROPOSAL_RESPONDED, { ...this.event(p), accepted: true, note: null });
    return this.view(token);
  }

  async requestChanges(token: string, note: string) {
    const p = await this.findOpen(token);
    const done = await this.repo.transition(p.id, OPEN, {
      status: ProposalStatus.CHANGES_REQUESTED,
      respondedAt: new Date(),
      responseNote: note.trim().slice(0, 2000),
    });
    if (!done) throw new ConflictException('This proposal was already answered');
    this.events.emit(EVENT_NAMES.PROPOSAL_RESPONDED, { ...this.event(p), accepted: false, note: note.trim().slice(0, 300) });
    return this.view(token);
  }

  private async find(token: string) {
    if (!token || token.length > 64) throw new NotFoundException('Proposal not found');
    const p = await this.repo.findByToken(token);
    if (!p) throw new NotFoundException('Proposal not found');
    return p;
  }

  private async findOpen(token: string) {
    const p = await this.find(token);
    if (!OPEN.includes(p.status)) throw new ConflictException('This proposal was already answered');
    if (isExpired(p)) throw new BadRequestException('This proposal has expired. Ask for a new one.');
    return p;
  }

  private event(p: Awaited<ReturnType<RespondProposalUseCase['find']>>): ProposalEvent {
    return {
      orgId: p.orgId,
      proposalId: p.id,
      number: proposalNumber(p.number),
      title: p.title,
      contactId: p.contact.id,
      contactName: p.contact.name || p.contact.phoneNumber,
      dealId: p.dealId,
      userId: p.createdById,
      total: Number(p.total),
      currency: p.currency,
    };
  }
}
