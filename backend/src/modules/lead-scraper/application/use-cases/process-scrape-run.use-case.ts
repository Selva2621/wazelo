import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ScrapeRun, ScrapeRunStatus, ScrapeSource } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ScrapeRunRepository } from '../../infrastructure/repositories/scrape-run.repository';
import { ScraperFactory } from '../../domain/scrapers/scraper.factory';
import { ScrapedLead } from '../../domain/scrapers/scraper.interface';
import { inspectWebsite } from '../../domain/scrapers/website-email-finder';
import { dedupeLeads } from '../../domain/services/dedupe-leads';
import { LeadFilters, hasActiveFilters, matchesFilters } from '../../domain/services/lead-filters';
import { scoreLead } from '../../domain/services/lead-score';
import { ScrapeTimeoutError, scrapeRunTimeoutMs } from '../../domain/services/scrape-timeout';

/** Websites fetched in parallel when looking for emails */
const WEBSITE_LOOKUP_CONCURRENCY = 5;
/** Job boards: fetch this many times maxResults when filters will drop some */
const JOB_FILTER_OVERSCAN = 3;
/** How often a running scrape checks whether the user cancelled it */
const CANCEL_POLL_MS = 5_000;

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

    const filters = (run.filters as LeadFilters | null) ?? null;
    const isMaps = run.source === ScrapeSource.GOOGLE_MAPS;
    const limitMs = scrapeRunTimeoutMs({
      maxResults: run.maxResults,
      isMaps,
      filtered: hasActiveFilters(filters),
      collectLastReview: filters?.activeWithinMonths != null,
      findEmails: findsEmails(filters, isMaps),
    });

    // Stop the scrape (closing its browser) when it runs past its limit or the user cancels it
    const abort = new AbortController();
    const deadline = setTimeout(() => abort.abort(new ScrapeTimeoutError(limitMs)), limitMs);
    const cancelWatch = setInterval(() => {
      this.scrapeRunRepository
        .findById(scrapeRunId)
        .then((r) => {
          if (r?.status === ScrapeRunStatus.CANCELLED) abort.abort(new Error('Cancelled'));
        })
        .catch(() => undefined);
    }, CANCEL_POLL_MS);

    try {
      const { leads, duplicates } = await untilAborted(this.collect(run, filters, isMaps, abort.signal), abort.signal);

      // Cancelled just before the scrape returned — discard results
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
      // A cancelled run is no longer RUNNING, so this leaves it CANCELLED
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`ScrapeRun ${scrapeRunId} failed: ${errorMessage}`);
      await this.scrapeRunRepository.transition(scrapeRunId, [ScrapeRunStatus.RUNNING], {
        status: ScrapeRunStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      });
    } finally {
      clearTimeout(deadline);
      clearInterval(cancelWatch);
      abort.abort(); // close the browser if the scraper is still holding it
    }
  }

  /** Scrape, filter, dedupe and (optionally) look up emails — everything the deadline covers. */
  private async collect(
    run: ScrapeRun,
    filters: LeadFilters | null,
    isMaps: boolean,
    signal: AbortSignal,
  ): Promise<{ leads: ScrapedLead[]; duplicates: number }> {
    const inspected = new WeakSet<ScrapedLead>();
    const accept = hasActiveFilters(filters)
      ? (lead: ScrapedLead) => this.accepts(lead, filters!, run.orgId, run.id, inspected, findsEmails(filters, isMaps))
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
        signal,
      });
    } else {
      // Job boards return a list in one go: fetch extra, then filter down to maxResults
      const fetchCount = accept ? Math.min(run.maxResults * JOB_FILTER_OVERSCAN, 200) : run.maxResults;
      const fetched = await scraper.scrape(run.keywords, run.location ?? undefined, fetchCount, { signal });
      scraped = [];
      for (const lead of fetched) {
        if (scraped.length >= run.maxResults || signal.aborted) break;
        if (!accept || (await accept(lead))) scraped.push(lead);
      }
    }
    const { unique: leads, duplicates } = dedupeLeads(scraped);

    if (findsEmails(filters, isMaps)) await this.inspectWebsites(leads, inspected, signal);
    return { leads, duplicates };
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
    findEmail: boolean,
  ): Promise<boolean> {
    if (filters.websiteIssues?.length && lead.website && !inspected.has(lead)) {
      await this.inspectLeadWebsite(lead, findEmail, inspected);
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
  private async inspectWebsites(leads: ScrapedLead[], inspected: WeakSet<ScrapedLead>, signal: AbortSignal): Promise<void> {
    const queue = leads.filter((l) => l.website && !inspected.has(l));
    const worker = async () => {
      for (let lead = queue.shift(); lead && !signal.aborted; lead = queue.shift()) {
        await this.inspectLeadWebsite(lead, true, inspected);
      }
    };
    await Promise.all(Array.from({ length: WEBSITE_LOOKUP_CONCURRENCY }, worker));
  }
}

/** Google Maps always looks up an email on the lead's website, like the phone; job boards only when asked. */
function findsEmails(filters: LeadFilters | null, isMaps: boolean): boolean {
  return isMaps || !!filters?.findEmails;
}

/**
 * Settle with `work`, or reject with the abort reason as soon as `signal` fires — so a scraper
 * that ignores the signal can't keep the run going. Its late result or error is dropped.
 */
function untilAborted<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  work.catch(() => undefined);
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    work.then(resolve, reject);
  });
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
