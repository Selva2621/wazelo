import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ProposalStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { OrgLocaleService } from '@/modules/org/domain/services/org-locale.service';
import { ProposalRepository } from '../../infrastructure/repositories/proposal.repository';
import { cleanItems, cleanScope, computeTotals, ProposalItem } from '../../domain/services/proposal-math';
import { toProposalView } from '../proposal-view';

export interface ProposalFields {
  title?: string;
  intro?: string | null;
  scope?: string[];
  items?: ProposalItem[];
  taxPercent?: number;
  discount?: number;
  currency?: string;
  terms?: string | null;
  validUntil?: string | null;
}

const DEFAULT_VALID_DAYS = 14;

/** Create, edit, list and delete proposals (the owner's side). */
@Injectable()
export class ManageProposalsUseCase {
  constructor(
    private readonly repo: ProposalRepository,
    private readonly orgLocale: OrgLocaleService,
    private readonly config: ConfigService,
  ) {}

  get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  /** A draft for the contact, prefilled from the deal (its product/value) when given. */
  async create(orgId: string, userId: string, input: { contactId: string; dealId?: string }) {
    const contact = await this.repo.findContact(orgId, input.contactId);
    if (!contact) throw new NotFoundException('Contact not found');
    const deal = input.dealId ? await this.repo.findDeal(orgId, input.dealId) : null;
    if (input.dealId && (!deal || deal.contactId !== contact.id)) throw new BadRequestException("That deal isn't this contact's");

    const value = deal?.value != null ? Number(deal.value) : null;
    const items: ProposalItem[] = deal?.product
      ? [{ name: deal.product.name, quantity: 1, unitPrice: deal.product.price != null ? Number(deal.product.price) : value ?? 0 }]
      : value
        ? [{ name: deal!.title, quantity: 1, unitPrice: value }]
        : [];
    const totals = computeTotals(items, 0, 0);

    const proposal = await this.repo.create({
      orgId,
      contactId: contact.id,
      dealId: deal?.id ?? null,
      title: (deal?.title ?? `Proposal for ${contact.name || contact.phoneNumber}`).slice(0, 300),
      items: items as unknown as Prisma.InputJsonValue,
      scope: [],
      subtotal: totals.subtotal,
      total: totals.total,
      currency: deal?.currency || (await this.orgLocale.get(orgId)).currency,
      validUntil: new Date(Date.now() + DEFAULT_VALID_DAYS * 86_400_000),
      publicToken: randomBytes(24).toString('base64url'),
      createdById: userId,
    });
    return toProposalView(proposal, this.frontendUrl);
  }

  async get(orgId: string, id: string) {
    return toProposalView(await this.find(orgId, id), this.frontendUrl);
  }

  async list(orgId: string, filter: { contactId?: string; dealId?: string; status?: ProposalStatus }) {
    const rows = await this.repo.list(orgId, filter);
    return rows.map(({ number, total, ...r }) => ({ ...r, number: `P-${String(number).padStart(4, '0')}`, total: Number(total) }));
  }

  /** Saves edits; totals are recomputed. An accepted proposal is final. */
  async update(orgId: string, id: string, fields: ProposalFields) {
    const current = await this.find(orgId, id);
    if (current.status === ProposalStatus.ACCEPTED) throw new BadRequestException('This proposal was accepted and can no longer be changed');

    const items = fields.items !== undefined ? cleanItems(fields.items) : cleanItems(current.items);
    const taxPercent = fields.taxPercent ?? Number(current.taxPercent);
    const discount = fields.discount ?? Number(current.discount);
    const totals = computeTotals(items, taxPercent, discount);

    const updated = await this.repo.update(id, {
      ...(fields.title !== undefined && { title: fields.title.trim().slice(0, 300) || current.title }),
      ...(fields.intro !== undefined && { intro: fields.intro?.trim() || null }),
      ...(fields.scope !== undefined && { scope: cleanScope(fields.scope) }),
      ...(fields.terms !== undefined && { terms: fields.terms?.trim() || null }),
      ...(fields.currency !== undefined && { currency: fields.currency.toUpperCase() }),
      ...(fields.validUntil !== undefined && { validUntil: fields.validUntil ? new Date(fields.validUntil) : null }),
      items: items as unknown as Prisma.InputJsonValue,
      taxPercent,
      discount: totals.discount,
      subtotal: totals.subtotal,
      total: totals.total,
    });
    return toProposalView(updated, this.frontendUrl);
  }

  async remove(orgId: string, id: string) {
    if (!(await this.repo.softDelete(id, orgId))) throw new NotFoundException('Proposal not found');
    return { deleted: true };
  }

  async find(orgId: string, id: string) {
    const proposal = await this.repo.findById(id, orgId);
    if (!proposal) throw new NotFoundException('Proposal not found');
    return proposal;
  }
}
