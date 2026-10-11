import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContactSource } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ContactRepository } from '@/modules/contacts/infrastructure/repositories/contact.repository';
import { EVENT_NAMES } from '@/common/constants';

function normalizeE164(phone: string): string | null {
  if (!phone) return null;
  const hasPlus = phone.trimStart().startsWith('+');
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return hasPlus ? `+${digits}` : digits;
}

export interface ImportScrapeResultsOutcome {
  imported: number;
  skipped: number;
  /** Results with no usable phone number — a contact needs one to be messaged */
  noPhone: number;
}

@Injectable()
export class ImportScrapeResultsUseCase {
  private readonly logger = new Logger(ImportScrapeResultsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contactRepository: ContactRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    scrapeRunId: string,
    resultIds: string[] = [],
  ): Promise<ImportScrapeResultsOutcome> {
    const run = await this.prisma.scrapeRun.findFirst({
      where: { id: scrapeRunId, orgId },
      select: { id: true, source: true },
    });
    if (!run) throw new NotFoundException('Scrape run not found');

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

    for (const result of results) {
      try {
        // A contact must be reachable on WhatsApp. Job-board leads (Freelancer,
        // Truelancer, Upwork) have no phone — bid on them via their link instead
        // of creating a contact with a made-up number.
        const phoneNumber = result.phone ? normalizeE164(result.phone) : null;
        if (!phoneNumber) {
          noPhone++;
          continue;
        }

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
        skipped++;
      }
    }

    const totalImported = await this.prisma.scrapeResult.count({
      where: { scrapeRunId, imported: true },
    });
    await this.prisma.scrapeRun.update({
      where: { id: scrapeRunId },
      data: { importedCount: totalImported },
    });

    return { imported, skipped, noPhone };
  }
}
