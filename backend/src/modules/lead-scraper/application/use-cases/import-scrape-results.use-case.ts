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

function placeholderPhone(seed: string): string {
  const hash = Math.abs(
    seed.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0),
  );
  return `+00${hash.toString().padStart(10, '0')}`;
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
    resultIds: string[] = [],
  ): Promise<{ imported: number; skipped: number }> {
    const where: Record<string, unknown> = { orgId, imported: false };
    if (resultIds.length > 0) {
      where['id'] = { in: resultIds };
    }

    const results = await this.prisma.scrapeResult.findMany({ where });

    if (!results.length) throw new NotFoundException('No unimported results found');

    let imported = 0;
    let skipped = 0;

    for (const result of results) {
      try {
        const hasPhone = Boolean(result.phone);
        const hasEmail = Boolean(result.email);

        let phoneNumber: string;

        if (hasPhone) {
          const normalized = normalizeE164(result.phone!);
          if (!normalized) { skipped++; continue; }
          phoneNumber = normalized;
        } else if (hasEmail) {
          const existing = await this.prisma.contact.findFirst({
            where: { orgId, email: result.email, deletedAt: null },
          });
          if (existing) {
            await this.prisma.scrapeResult.update({ where: { id: result.id }, data: { imported: true, contactId: existing.id } });
            skipped++;
            continue;
          }
          phoneNumber = placeholderPhone(result.email!);
        } else {
          phoneNumber = placeholderPhone(result.sourceUrl);
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
          scrapeSource: (result as any).scrapeRunId,
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

    // Update importedCount on the scrape run
    if (results.length > 0) {
      const scrapeRunId = results[0].scrapeRunId;
      const totalImported = await this.prisma.scrapeResult.count({
        where: { scrapeRunId, imported: true },
      });
      await this.prisma.scrapeRun.update({
        where: { id: scrapeRunId },
        data: { importedCount: totalImported },
      });
    }

    return { imported, skipped };
  }
}
