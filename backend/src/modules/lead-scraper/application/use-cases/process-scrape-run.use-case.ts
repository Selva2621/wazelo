import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ScrapeRunStatus, ScrapeSource } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ScrapeRunRepository } from '../../infrastructure/repositories/scrape-run.repository';
import { ScraperFactory } from '../../domain/scrapers/scraper.factory';
import { ScrapedLead } from '../../domain/scrapers/scraper.interface';
import { inspectWebsite } from '../../domain/scrapers/website-email-finder';
import { dedupeLeads } from '../../domain/services/dedupe-leads';
import { LeadFilters, hasActiveFilters, matchesFilters } from '../../domain/services/lead-filters';
import { scoreLead } from '../../domain/services/lead-score';

/** Websites fetched in parallel when looking for emails */
const WEBSITE_LOOKUP_CONCURRENCY = 5;
/** Job boards: fetch this many times maxResults when filters will drop some */
const JOB_FILTER_OVERSCAN = 3;

@Injectable()
export class ProcessScrapeRunUseCase {
  private readonly logger = new Logger(ProcessScrapeRunUseCase.name);

  constructor(
    private readonly scrapeRunRepository: ScrapeRunRepository,
    private readonly scraperFactory: ScraperFactory,
    private readonly prisma: PrismaService,
  ) {}

  async execute(scrapeRunId: string): Promise<void> {
    const run = await this.scrapeRunRepository.findById(scrapeRunId);
    if (!run) {
      this.logger.warn(`ScrapeRun ${scrapeRunId} not found`);
      return;
    }
    if (run.status !== ScrapeRunStatus.PENDING && run.status !== ScrapeRunStatus.RUNNING) {
      return;
    }

    // Conditional transition so a run cancelled while queued is never started
    const started = await this.scrapeRunRepository.transition(
      scrapeRunId,
      [ScrapeRunStatus.PENDING, ScrapeRunStatus.RUNNING],
      { status: ScrapeRunStatus.RUNNING },
    );
    if (!started) return;

    try {
      const filters = (run.filters as LeadFilters | null) ?? null;
      const isMaps = run.source === ScrapeSource.GOOGLE_MAPS;
      const inspected = new WeakSet<ScrapedLead>();
      const accept = hasActiveFilters(filters)
        ? (lead: ScrapedLead) => this.accepts(lead, filters!, run.orgId, run.id, inspected)
        : undefined;

      const scraper = this.scraperFactory.getScraper(run.source);
      let scraped: ScrapedLead[];
      if (isMaps) {
        // Maps applies the filter while scraping, so maxResults counts matching places
        scraped = await scraper.scrape(run.keywords, run.location ?? undefined, run.maxResults, {
          accept,
          areas: filters?.areas,
          radiusKm: filters?.radiusKm,
          collectLastReview: filters?.activeWithinMonths != null,
        });
      } else {
        // Job boards return a list in one go: fetch extra, then filter down to maxResults
        const fetchCount = accept ? Math.min(run.maxResults * JOB_FILTER_OVERSCAN, 200) : run.maxResults;
        const fetched = await scraper.scrape(run.keywords, run.location ?? undefined, fetchCount);
        scraped = [];
        for (const lead of fetched) {
          if (scraped.length >= run.maxResults) break;
          if (!accept || (await accept(lead))) scraped.push(lead);
        }
      }
      const { unique: leads, duplicates } = dedupeLeads(scraped);

      if (filters?.findEmails) await this.inspectWebsites(leads, inspected);

      // The scrape itself can't be interrupted; if the user cancelled meanwhile, discard results
      const current = await this.scrapeRunRepository.findById(scrapeRunId);
      if (current?.status === ScrapeRunStatus.CANCELLED) {
        this.logger.log(`ScrapeRun ${scrapeRunId} was cancelled — discarding ${leads.length} results`);
        return;
      }

      // Save all results to scrape_results table (no contact creation)
      if (leads.length > 0) {
        await this.prisma.scrapeResult.createMany({
          data: leads.map((lead) => ({
            ...(isMaps ? scoreLead(lead) : { score: null, tags: [] }),
            scrapeRunId: run.id,
            orgId: run.orgId,
            name: lead.name ?? null,
            phone: lead.phone ?? null,
            email: lead.email ?? null,
            company: lead.company ?? null,
            jobTitle: lead.jobTitle ?? null,
            location: lead.location ?? null,
            address: lead.address ?? null,
            website: lead.website ?? null,
            budget: lead.budget ?? null,
            skills: lead.skills ?? [],
            rating: lead.rating ?? null,
            reviewCount: lead.reviewCount ?? null,
            category: lead.category ?? null,
            description: lead.description ?? null,
            openingHours: lead.openingHours ?? null,
            socialLinks: lead.socialLinks ?? [],
            details: leadDetails(lead),
            sourceUrl: lead.sourceUrl,
          })),
        });
      }

      const completed = await this.scrapeRunRepository.transition(scrapeRunId, [ScrapeRunStatus.RUNNING], {
        status: ScrapeRunStatus.COMPLETED,
        resultCount: leads.length,
        skippedCount: duplicates,
        completedAt: new Date(),
      });
      if (!completed) {
        // Cancelled while results were being saved
        await this.prisma.scrapeResult.deleteMany({ where: { scrapeRunId } });
        return;
      }

      this.logger.log(
        `ScrapeRun ${scrapeRunId} completed: ${leads.length} results saved, ${duplicates} duplicates dropped`,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`ScrapeRun ${scrapeRunId} failed: ${errorMessage}`);
      await this.scrapeRunRepository.transition(scrapeRunId, [ScrapeRunStatus.RUNNING], {
        status: ScrapeRunStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      });
    }
  }

  /**
   * Full filter check for one lead: scraped fields first (cheap), then the website
   * when website filters need it, then the database for "new only" / existing contacts.
   */
  private async accepts(
    lead: ScrapedLead,
    filters: LeadFilters,
    orgId: string,
    runId: string,
    inspected: WeakSet<ScrapedLead>,
  ): Promise<boolean> {
    if (filters.websiteIssues?.length && lead.website && !inspected.has(lead)) {
      await this.inspectLeadWebsite(lead, !!filters.findEmails, inspected);
    }
    if (!matchesFilters(lead, filters)) return false;

    if (filters.skipExistingContacts && lead.phone) {
      const contact = await this.prisma.contact.findFirst({
        where: { orgId, phoneNumber: lead.phone, deletedAt: null },
        select: { id: true },
      });
      if (contact) return false;
    }

    if (filters.newOnly) {
      const prior = await this.prisma.scrapeResult.findFirst({
        where: {
          orgId,
          scrapeRunId: { not: runId },
          OR: [
            ...(lead.phone ? [{ phone: lead.phone }] : []),
            { sourceUrl: { startsWith: lead.sourceUrl.split('?')[0] } },
          ],
        },
        select: { id: true },
      });
      if (prior) return false;
    }

    return true;
  }

  private async inspectLeadWebsite(lead: ScrapedLead, findEmail: boolean, inspected: WeakSet<ScrapedLead>) {
    inspected.add(lead);
    const { site, email } = await inspectWebsite(lead.website!, { findEmail: findEmail && !lead.email });
    lead.site = site;
    if (email) lead.email = email;
  }

  /** Fetch each lead's website for an email and marketing signals, a few at a time. */
  private async inspectWebsites(leads: ScrapedLead[], inspected: WeakSet<ScrapedLead>): Promise<void> {
    const queue = leads.filter((l) => l.website && !inspected.has(l));
    const worker = async () => {
      for (let lead = queue.shift(); lead; lead = queue.shift()) {
        await this.inspectLeadWebsite(lead, true, inspected);
      }
    };
    await Promise.all(Array.from({ length: WEBSITE_LOOKUP_CONCURRENCY }, worker));
  }
}

/** Source-specific extras kept as JSON (shown in the results table, used by filters) */
function leadDetails(lead: ScrapedLead): Prisma.InputJsonObject {
  const details = {
    claimed: lead.claimed,
    photoCount: lead.photoCount,
    priceLevel: lead.priceLevel,
    weeklyHours: lead.weeklyHours,
    lat: lead.lat,
    lng: lead.lng,
    lastReviewAt: lead.lastReviewAt,
    site: lead.site,
    budgetMin: lead.budgetMin,
    budgetMax: lead.budgetMax,
    budgetType: lead.budgetType,
    postedAt: lead.postedAt,
    paymentVerified: lead.paymentVerified,
    proposals: lead.proposals,
    clientCountry: lead.clientCountry,
  };
  // Drop unknowns so the JSON only holds what the page actually showed
  return Object.fromEntries(Object.entries(details).filter(([, v]) => v !== undefined)) as Prisma.InputJsonObject;
}
