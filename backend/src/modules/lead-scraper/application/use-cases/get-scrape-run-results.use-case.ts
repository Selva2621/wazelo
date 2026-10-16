import { Injectable, NotFoundException } from '@nestjs/common';
import { ScrapeResult } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

/** A run holds at most 200 results (TriggerScrapeDto.maxResults) */
const MAX_TAKE = 200;

export interface AnnotatedScrapeResult extends ScrapeResult {
  /** A live contact already has this number (imported here or anywhere else) */
  existingContactId: string | null;
  /** When an earlier run of this org first found the same lead */
  seenBeforeAt: Date | null;
}

/** "+919840012345" and "919840012345" are the same number — contacts may hold either */
function phoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, '');
  return [phone, digits, `+${digits}`];
}

const digitsOf = (phone: string) => phone.replace(/\D/g, '');

/** A listing's own URL identifies it; a shared search-page URL (job-board fallback) does not */
const urlKey = (url: string) => (/\/search/.test(url) ? null : url.split('?')[0]);

@Injectable()
export class GetScrapeRunResultsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(orgId: string, runId: string, skip = 0, take = MAX_TAKE) {
    const run = await this.prisma.scrapeRun.findFirst({
      where: { id: runId, orgId },
      select: { id: true, createdAt: true },
    });
    if (!run) throw new NotFoundException('Scrape run not found');

    const [results, total] = await Promise.all([
      this.prisma.scrapeResult.findMany({
        where: { scrapeRunId: runId, orgId },
        skip: Math.max(skip, 0),
        take: Math.min(Math.max(take, 1), MAX_TAKE),
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.scrapeResult.count({ where: { scrapeRunId: runId, orgId } }),
    ]);

    const phones = [...new Set(results.flatMap((r) => (r.phone ? phoneVariants(r.phone) : [])))];
    const urlKeys = [...new Set(results.map((r) => urlKey(r.sourceUrl)).filter((k): k is string => !!k))];

    const [contacts, prior] = await Promise.all([
      phones.length
        ? this.prisma.contact.findMany({
            where: { orgId, deletedAt: null, phoneNumber: { in: phones } },
            select: { id: true, phoneNumber: true },
          })
        : Promise.resolve([]),
      phones.length || urlKeys.length
        ? this.prisma.scrapeResult.findMany({
            where: {
              orgId,
              scrapeRunId: { not: runId },
              // Only runs started before this one — a later run must not mark this one's leads as old
              createdAt: { lt: run.createdAt },
              OR: [
                ...(phones.length ? [{ phone: { in: phones } }] : []),
                ...urlKeys.map((k) => ({ sourceUrl: { startsWith: k } })),
              ],
            },
            select: { phone: true, sourceUrl: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const contactByDigits = new Map(contacts.map((c) => [digitsOf(c.phoneNumber), c.id]));
    const firstSeen = new Map<string, Date>();
    for (const p of prior) {
      const url = urlKey(p.sourceUrl);
      // Ascending order, so the first write per key is the earliest
      for (const key of [p.phone && `phone:${digitsOf(p.phone)}`, url && `url:${url}`]) {
        if (key && !firstSeen.has(key)) firstSeen.set(key, p.createdAt);
      }
    }

    const annotated: AnnotatedScrapeResult[] = results.map((r) => {
      const digits = r.phone ? digitsOf(r.phone) : undefined;
      const url = urlKey(r.sourceUrl);
      return {
        ...r,
        existingContactId: r.contactId ?? (digits ? contactByDigits.get(digits) ?? null : null),
        seenBeforeAt:
          (digits ? firstSeen.get(`phone:${digits}`) : undefined) ??
          (url ? firstSeen.get(`url:${url}`) : undefined) ??
          null,
      };
    });

    return { results: annotated, total };
  }
}
