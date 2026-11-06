import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContactSource } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ContactRepository } from '@/modules/contacts/infrastructure/repositories/contact.repository';
import { EVENT_NAMES } from '@/common/constants';
import { OrgLocaleService } from '@/modules/org/domain/services/org-locale.service';
import { toE164 } from '@/shared/utils/phone.util';

/** Phone numbers imported at once */
const IMPORT_CONCURRENCY = 8;

export interface ImportScrapeResultsOutcome {
  imported: number;
  skipped: number;
  /** Results with no usable phone number — a contact needs one to be messaged */
  noPhone: number;
  /** Results that hit an error while importing (counted apart from duplicates) */
  failed: number;
}

@Injectable()
export class ImportScrapeResultsUseCase {
  private readonly logger = new Logger(ImportScrapeResultsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contactRepository: ContactRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly orgLocale: OrgLocaleService,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    scrapeRunId: string,
    resultIds: string[] = [],
  ): Promise<ImportScrapeResultsOutcome> {
    const run = await this.prisma.scrapeRun.findFirst({
      where: { id: scrapeRunId, orgId },
      select: { id: true, source: true, filters: true },
    });
    if (!run) throw new NotFoundException('Scrape run not found');

    // Numbers without a country code belong to the country the run searched in
    const country =
      (run.filters as { country?: string } | null)?.country ??
      (await this.orgLocale.get(orgId)).country;

    // Scoped to this run — without resultIds it imports the run's remaining
    // results, never other runs' results
    const results = await this.prisma.scrapeResult.findMany({
      where: {
        orgId,
        scrapeRunId,
        imported: false,
        ...(resultIds.length > 0 && { id: { in: resultIds } }),
      },
    });

    if (!results.length) throw new NotFoundException('No unimported results found');

    let imported = 0;
    let skipped = 0;
    let noPhone = 0;
    // Real errors, reported separately so they aren't mistaken for duplicates
    let failed = 0;

    // A contact must be reachable on WhatsApp. Job-board leads (Freelancer,
    // Truelancer, Upwork) have no phone — bid on them via their link instead
    // of creating a contact with a made-up number.
    // Leads sharing a number (chain branches) are imported one after another so
    // the upsert never races itself into duplicate contacts.
    const byPhone = new Map<string, typeof results>();
    for (const result of results) {
      const phoneNumber = toE164(result.phone, country);
      if (!phoneNumber) {
        noPhone++;
        continue;
      }
      byPhone.set(phoneNumber, [...(byPhone.get(phoneNumber) ?? []), result]);
    }

    const importOne = async (phoneNumber: string, result: (typeof results)[number]) => {
      try {
        const metadata: Record<string, unknown> = {
          company: result.company,
          jobTitle: result.jobTitle,
          budget: result.budget,
          skills: result.skills,
          website: result.website,
          rating: result.rating,
          reviewCount: result.reviewCount,
          category: result.category,
          address: result.address,
          leadScore: result.score,
          leadTags: result.tags,
          sourceUrl: result.sourceUrl,
          scrapeSource: run.source,
          scrapeRunId: run.id,
        };

        const { contact, created } = await this.contactRepository.upsertByPhone(
          {
            orgId,
            phoneNumber,
            name: result.name ?? undefined,
            email: result.email ?? undefined,
            source: ContactSource.WEB_SCRAPE,
            ownerId: userId,
            metadata,
          },
          userId,
        );

        await this.prisma.scrapeResult.update({
          where: { id: result.id },
          data: { imported: true, contactId: contact.id },
        });
        // Keep a known "on WhatsApp?" answer so campaigns can skip dead numbers
        // without checking them again
        if (result.waExists !== null && result.waCheckedAt) {
          await this.prisma.contact.update({
            where: { id: contact.id },
            data: { waExists: result.waExists, waCheckedAt: result.waCheckedAt },
          });
        }

        if (created) {
          imported++;
          this.eventEmitter.emit(EVENT_NAMES.CONTACT_CREATED, {
            contactId: contact.id,
            orgId,
            source: ContactSource.WEB_SCRAPE,
            createdById: userId,
          });
        } else {
          skipped++;
        }
      } catch (err) {
        this.logger.warn(`Failed to import result ${result.id}: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
    };

    // A few numbers at a time: one by one took ~0.8s per lead on a remote DB,
    // so 50 leads outran the app's request timeout
    const groups = [...byPhone.entries()];
    for (let i = 0; i < groups.length; i += IMPORT_CONCURRENCY) {
      await Promise.all(
        groups.slice(i, i + IMPORT_CONCURRENCY).map(async ([phoneNumber, group]) => {
          for (const result of group) await importOne(phoneNumber, result);
        }),
      );
    }

    const totalImported = await this.prisma.scrapeResult.count({
      where: { scrapeRunId, imported: true },
    });
    await this.prisma.scrapeRun.update({
      where: { id: scrapeRunId },
      data: { importedCount: totalImported },
    });

    return { imported, skipped, noPhone, failed };
  }
}
