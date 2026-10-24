import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProposalStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { htmlToPdf } from '@/infrastructure/external/pdf/html-to-pdf';
import { ProposalRepository, ProposalWithPeople } from '../../infrastructure/repositories/proposal.repository';
import { cleanItems, cleanScope, computeTotals, proposalNumber } from '../../domain/services/proposal-math';
import { renderProposalHtml } from '../../domain/services/proposal-html';

export interface ProposalPdf {
  pdf: Buffer;
  fileName: string;
}

const CACHE_SIZE = 30;

/** "Proposal P-0001 - Bakery website.pdf" — safe for a download header and WhatsApp */
export function pdfFileName(number: string, title: string): string {
  const clean = title.replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return `Proposal ${number}${clean ? ` - ${clean}` : ''}.pdf`;
}

/** The proposal as an A4 PDF: for the owner, for the client's link, and attached on WhatsApp. */
@Injectable()
export class ProposalPdfUseCase {
  // Same proposal, same version → same PDF (the client may open it a few times)
  private readonly cache = new Map<string, ProposalPdf>();

  constructor(
    private readonly repo: ProposalRepository,
    private readonly config: ConfigService,
  ) {}

  async forOwner(orgId: string, id: string): Promise<ProposalPdf> {
    const p = await this.repo.findById(id, orgId);
    if (!p) throw new NotFoundException('Proposal not found');
    return this.render(p, await this.repo.orgBranding(orgId));
  }

  async forClient(token: string): Promise<ProposalPdf> {
    const p = token && token.length <= 64 ? await this.repo.findByToken(token) : null;
    if (!p) throw new NotFoundException('Proposal not found');
    return this.render(p, p.organization);
  }

  /** Writes the PDF where chat attachments live and returns its URL, for sending on WhatsApp. */
  async saveForWhatsApp(p: ProposalWithPeople): Promise<{ url: string; fileName: string }> {
    const { pdf, fileName } = await this.render(p, await this.repo.orgBranding(p.orgId));
    const dir = join(process.cwd(), 'uploads');
    await mkdir(dir, { recursive: true });
    const stored = `${randomUUID()}.pdf`;
    await writeFile(join(dir, stored), pdf);
    const apiBase =
      this.config.get<string>('API_PUBLIC_URL') ||
      `http://localhost:${this.config.get<string>('PORT', '3000')}/${this.config.get<string>('API_PREFIX', 'api/v1')}`;
    return { url: `${apiBase.replace(/\/$/, '')}/files/${stored}`, fileName };
  }

  private async render(
    p: ProposalWithPeople,
    org: { name: string; website: string | null; timezone?: string | null } | null,
  ): Promise<ProposalPdf> {
    const key = `${p.id}:${p.updatedAt.getTime()}:${p.status}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const items = cleanItems(p.items);
    const taxPercent = Number(p.taxPercent);
    const number = proposalNumber(p.number);
    const html = renderProposalHtml({
      number,
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
      clientName: p.contact.name,
      businessName: org?.name || 'Proposal',
      businessWebsite: org?.website ?? null,
      timeZone: org?.timezone || 'UTC',
      ...(p.status === ProposalStatus.ACCEPTED && { acceptedBy: p.acceptedBy, acceptedAt: p.respondedAt }),
    });
    const result = { pdf: await htmlToPdf(html), fileName: pdfFileName(number, p.title) };

    this.cache.set(key, result);
    if (this.cache.size > CACHE_SIZE) this.cache.delete(this.cache.keys().next().value!);
    return result;
  }
}
