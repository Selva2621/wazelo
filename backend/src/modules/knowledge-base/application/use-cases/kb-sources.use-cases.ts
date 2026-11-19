import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';
import { assertPublicUrl } from '@/common/utils/public-fetch.util';
import { crawlWebsite, normalizeUrl } from '@/infrastructure/external/web-crawler/website-crawler';
import { AiCreditsService } from '@/modules/billing/domain/services/ai-credits.service';
import { KbSourceRepository } from '../../infrastructure/repositories/kb-source.repository';
import { KbChunkRepository } from '../../infrastructure/repositories/kb-chunk.repository';
import { chunkText } from '../../domain/services/chunk-text';

export interface CrawlWebsiteJobData {
  sourceId: string;
}

const MAX_SOURCES_PER_ORG = 5;
const MAX_PAGES = 30;

/** "bloombakery.in" → https://bloombakery.in, rejecting anything that isn't a public website */
async function websiteUrl(input: string): Promise<string> {
  const raw = input.trim();
  const url = normalizeUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (!url || !url.hostname.includes('.')) throw new BadRequestException('Enter a website address, e.g. yourbusiness.com');
  try {
    await assertPublicUrl(url);
  } catch {
    throw new BadRequestException("That website can't be reached");
  }
  return url.toString();
}

/** POST /kb/sources — learn from a website (crawled in the background). */
@Injectable()
export class AddWebsiteSourceUseCase {
  constructor(
    private readonly sources: KbSourceRepository,
    private readonly queue: QueueService,
    private readonly aiCredits: AiCreditsService,
  ) {}

  async execute(orgId: string, userId: string, input: string) {
    const url = await websiteUrl(input);
    if ((await this.sources.countActive(orgId)) >= MAX_SOURCES_PER_ORG) {
      throw new BadRequestException(`You can add up to ${MAX_SOURCES_PER_ORG} websites. Remove one first.`);
    }
    await this.aiCredits.assertCanAfford(orgId, 'kb_build');
    const source = await this.sources.create({ orgId, url, createdById: userId });
    await this.queue.publish<CrawlWebsiteJobData>(QUEUE_NAMES.CRAWL_WEBSITE, { sourceId: source.id });
    return source;
  }
}

/** POST /kb/sources/:id/resync — read the website again. */
@Injectable()
export class ResyncWebsiteSourceUseCase {
  constructor(
    private readonly sources: KbSourceRepository,
    private readonly queue: QueueService,
    private readonly aiCredits: AiCreditsService,
  ) {}

  async execute(orgId: string, id: string) {
    const source = await this.sources.findById(id, orgId);
    if (!source) throw new NotFoundException('Website not found');
    await this.aiCredits.assertCanAfford(orgId, 'kb_build');
    if (!(await this.sources.requeue(id))) throw new ConflictException('This website is being read right now');
    await this.queue.publish<CrawlWebsiteJobData>(QUEUE_NAMES.CRAWL_WEBSITE, { sourceId: id });
    return this.sources.findById(id, orgId);
  }
}

/**
 * Daily pass: queues a re-read of every website with weekly re-read on that was
 * last read 7+ days ago. Skipped (tried again next day) when the org can't afford it.
 */
@Injectable()
export class ResyncDueWebsitesUseCase {
  private readonly logger = new Logger(ResyncDueWebsitesUseCase.name);

  constructor(
    private readonly sources: KbSourceRepository,
    private readonly queue: QueueService,
    private readonly aiCredits: AiCreditsService,
  ) {}

  async execute(now = new Date()): Promise<number> {
    const due = await this.sources.findDueForResync(new Date(now.getTime() - 7 * 24 * 3_600_000));
    let queued = 0;
    for (const source of due) {
      if (!(await this.aiCredits.canAfford(source.orgId, 'kb_build'))) continue;
      if (!(await this.sources.requeue(source.id))) continue;
      await this.queue.publish<CrawlWebsiteJobData>(QUEUE_NAMES.CRAWL_WEBSITE, { sourceId: source.id });
      queued++;
    }
    if (due.length) this.logger.log(`Weekly website re-read: ${queued} of ${due.length} due queued`);
    return queued;
  }
}

/** GET /kb/sources and DELETE /kb/sources/:id */
@Injectable()
export class ManageWebsiteSourcesUseCase {
  constructor(private readonly sources: KbSourceRepository) {}

  async list(orgId: string) {
    const rows = await this.sources.listByOrg(orgId);
    return rows.map(({ _count, ...s }) => ({ ...s, pages: _count.documents }));
  }

  /** PATCH /kb/sources/:id — weekly re-read on or off. */
  async setAutoResync(orgId: string, id: string, autoResync: boolean) {
    const source = await this.sources.findById(id, orgId);
    if (!source) throw new NotFoundException('Website not found');
    await this.sources.update(id, { autoResync });
    return (await this.list(orgId)).find((s) => s.id === id);
  }

  async remove(orgId: string, id: string) {
    const source = await this.sources.findById(id, orgId);
    if (!source) throw new NotFoundException('Website not found');
    await this.sources.softDelete(id);
    return { deleted: true };
  }
}

/**
 * Worker side: crawls the website, stores each page as a KB document with
 * searchable passages, drops pages that disappeared, and charges `kb_build`
 * once the site was read. Progress is written as it goes (the UI polls it).
 */
@Injectable()
export class ProcessWebsiteSourceUseCase {
  private readonly logger = new Logger(ProcessWebsiteSourceUseCase.name);

  constructor(
    private readonly sources: KbSourceRepository,
    private readonly chunks: KbChunkRepository,
    private readonly aiCredits: AiCreditsService,
  ) {}

  async execute(sourceId: string): Promise<void> {
    const source = await this.sources.findById(sourceId);
    if (!source || source.status !== 'QUEUED') return; // deleted, or already handled
    await this.sources.update(sourceId, { status: 'CRAWLING', pagesDone: 0, pagesFound: 0, error: null });

    const keep: string[] = [];
    try {
      await crawlWebsite(source.url, {
        maxPages: MAX_PAGES,
        shouldStop: async () => !(await this.sources.findById(sourceId)),
        onPage: async (page, progress) => {
          const docId = await this.sources.upsertPage(source, page);
          await this.chunks.replaceForDocument(source.orgId, docId, page.title || null, chunkText(page.text));
          keep.push(docId);
          await this.sources.update(sourceId, { pagesDone: progress.done, pagesFound: progress.found });
        },
      });

      if (!(await this.sources.findById(sourceId))) return; // removed while crawling
      if (!keep.length) {
        await this.sources.update(sourceId, {
          status: 'FAILED',
          error: "Couldn't read any pages. Check the address, or that the site isn't blocking bots.",
        });
        return;
      }
      const removed = await this.sources.removeStalePages(sourceId, keep);
      await this.sources.update(sourceId, { status: 'READY', pagesFound: keep.length, lastSyncedAt: new Date() });
      await this.aiCredits.charge(source.orgId, 'kb_build');
      this.logger.log(`Website ${source.url}: ${keep.length} pages read, ${removed} stale removed (org ${source.orgId})`);
    } catch (err) {
      this.logger.error(`Website crawl failed (${source.url}): ${(err as Error).message}`);
      await this.sources.update(sourceId, { status: 'FAILED', error: 'Reading the website failed. Try again later.' });
    }
  }
}
