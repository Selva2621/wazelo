import { Injectable } from '@nestjs/common';
import { KbSource } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export type KbSourceStatus = 'QUEUED' | 'CRAWLING' | 'READY' | 'FAILED';

/** Websites an org learns from, and the page documents crawled from them. */
@Injectable()
export class KbSourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { orgId: string; url: string; createdById: string }): Promise<KbSource> {
    return this.prisma.kbSource.create({ data: { ...data, type: 'WEBSITE', status: 'QUEUED' } });
  }

  findById(id: string, orgId?: string): Promise<KbSource | null> {
    return this.prisma.kbSource.findFirst({ where: { id, deletedAt: null, ...(orgId && { orgId }) } });
  }

  listByOrg(orgId: string) {
    return this.prisma.kbSource.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { documents: { where: { deletedAt: null } } } } },
    });
  }

  countActive(orgId: string): Promise<number> {
    return this.prisma.kbSource.count({ where: { orgId, deletedAt: null } });
  }

  update(id: string, data: Partial<Pick<KbSource, 'status' | 'pagesFound' | 'pagesDone' | 'error' | 'lastSyncedAt' | 'autoResync'>>) {
    return this.prisma.kbSource.update({ where: { id }, data });
  }

  /** Weekly re-read on, last read over `olderThan` ago (or never finished), not running now. */
  findDueForResync(olderThan: Date, take = 50): Promise<KbSource[]> {
    return this.prisma.kbSource.findMany({
      where: {
        autoResync: true,
        deletedAt: null,
        status: { in: ['READY', 'FAILED'] },
        OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: olderThan } }],
        // A failed crawl retries at most daily, not on every pass
        updatedAt: { lt: new Date(Date.now() - 20 * 3_600_000) },
      },
      orderBy: { lastSyncedAt: 'asc' },
      take,
    });
  }

  /** Moves QUEUED/READY/FAILED → QUEUED for a resync; false while a crawl is running. */
  async requeue(id: string): Promise<boolean> {
    const { count } = await this.prisma.kbSource.updateMany({
      where: { id, deletedAt: null, status: { not: 'CRAWLING' } },
      data: { status: 'QUEUED', error: null, pagesDone: 0 },
    });
    return count > 0;
  }

  /** Single instance: a CRAWLING source at boot lost its worker in the restart. */
  async failCrawling(message: string): Promise<number> {
    const { count } = await this.prisma.kbSource.updateMany({
      where: { status: 'CRAWLING', deletedAt: null },
      data: { status: 'FAILED', error: message },
    });
    return count;
  }

  /** Creates or refreshes the document for one crawled page; returns its id. */
  async upsertPage(source: KbSource, page: { url: string; title: string; text: string }): Promise<string> {
    const existing = await this.prisma.kbDocument.findFirst({
      where: { sourceId: source.id, sourceUrl: page.url, deletedAt: null },
      select: { id: true },
    });
    const data = {
      title: page.title.slice(0, 255) || page.url.slice(0, 255),
      extractedText: page.text,
      fileSize: page.text.length,
      status: 'READY',
    };
    if (existing) {
      await this.prisma.kbDocument.update({ where: { id: existing.id }, data });
      return existing.id;
    }
    const doc = await this.prisma.kbDocument.create({
      data: {
        ...data,
        orgId: source.orgId,
        sourceId: source.id,
        sourceType: 'WEBSITE',
        sourceUrl: page.url,
        filename: (new URL(page.url).pathname || '/').slice(0, 255),
        fileUrl: page.url,
        contentType: 'text/html',
        uploadedById: source.createdById,
      },
      select: { id: true },
    });
    return doc.id;
  }

  /** Soft-deletes pages of the source not seen in the latest crawl, and drops their passages. */
  async removeStalePages(sourceId: string, keepIds: string[]): Promise<number> {
    const stale = await this.prisma.kbDocument.findMany({
      where: { sourceId, deletedAt: null, id: { notIn: keepIds } },
      select: { id: true },
    });
    if (!stale.length) return 0;
    const ids = stale.map((d) => d.id);
    await this.prisma.$transaction([
      this.prisma.kbChunk.deleteMany({ where: { documentId: { in: ids } } }),
      this.prisma.kbDocument.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } }),
    ]);
    return ids.length;
  }

  /** Soft-deletes the source and its pages, and drops their passages. */
  async softDelete(id: string): Promise<void> {
    const docs = await this.prisma.kbDocument.findMany({ where: { sourceId: id, deletedAt: null }, select: { id: true } });
    const ids = docs.map((d) => d.id);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.kbChunk.deleteMany({ where: { documentId: { in: ids } } }),
      this.prisma.kbDocument.updateMany({ where: { id: { in: ids } }, data: { deletedAt: now } }),
      this.prisma.kbSource.update({ where: { id }, data: { deletedAt: now } }),
    ]);
  }
}
