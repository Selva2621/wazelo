import { ProposalWithPeople } from '../infrastructure/repositories/proposal.repository';
import { cleanItems, cleanScope, computeTotals, isExpired, proposalNumber } from '../domain/services/proposal-math';

/** Link the client opens (the /p/:token page). */
export const publicProposalUrl = (frontendUrl: string, token: string) => `${frontendUrl.replace(/\/$/, '')}/p/${token}`;

/** A proposal as the app shows it: numbers as numbers, totals broken down, expiry worked out. */
export function toProposalView(p: ProposalWithPeople, frontendUrl: string, now = new Date()) {
  const items = cleanItems(p.items);
  const taxPercent = Number(p.taxPercent);
  return {
    id: p.id,
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
    status: p.status,
    expired: isExpired(p, now),
    publicUrl: publicProposalUrl(frontendUrl, p.publicToken),
    sentAt: p.sentAt,
    viewedAt: p.viewedAt,
    respondedAt: p.respondedAt,
    responseNote: p.responseNote,
    acceptedBy: p.acceptedBy,
    contact: p.contact,
    deal: p.deal ? { id: p.deal.id, title: p.deal.title, status: p.deal.status, pipelineId: p.deal.pipelineId } : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export type ProposalView = ReturnType<typeof toProposalView>;
