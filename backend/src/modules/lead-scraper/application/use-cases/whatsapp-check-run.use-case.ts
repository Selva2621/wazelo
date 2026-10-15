import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ScrapeRunStatus } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { QUEUE_NAMES, SEND_SAFETY_CONFIG } from '@/common/constants';
import { WhatsAppCheckThrottleService } from '../../domain/services/whatsapp-check-throttle.service';

export type WaCheckStateName = 'running' | 'done' | 'stopped' | 'no_session' | 'day_limit';

export interface WaCheckState {
  state: WaCheckStateName;
  /** Identifies the current job chain — a stale chain from an earlier start stops itself */
  token: string;
  /** Limit the check to these results; all results with a phone when absent */
  resultIds?: string[];
  startedAt: string;
  finishedAt?: string;
}

export interface WaCheckJobData {
  scrapeRunId: string;
  token: string;
}

/** Gap between live lookups — keeps well under the per-minute cap */
const LOOKUP_GAP_SECONDS = 7;
/** Wait when the per-minute cap is hit */
const MINUTE_LIMIT_RETRY_SECONDS = 15;

/**
 * Checks a run's phone numbers against WhatsApp in the background, one lookup per
 * job. Each job queues the next, so progress survives restarts and the user can
 * leave the page. Answers are stored on the results and reused across runs.
 */
@Injectable()
export class WhatsAppCheckRunUseCase {
  private readonly logger = new Logger(WhatsAppCheckRunUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly baileysManager: BaileysConnectionManager,
    private readonly throttle: WhatsAppCheckThrottleService,
  ) {}

  async start(orgId: string, scrapeRunId: string, resultIds?: string[]): Promise<WaCheckState> {
    const run = await this.prisma.scrapeRun.findFirst({ where: { id: scrapeRunId, orgId } });
    if (!run) throw new NotFoundException('Scrape run not found');
    if (run.status !== ScrapeRunStatus.COMPLETED) throw new BadRequestException('Run has not finished yet');

    const current = run.waCheck as WaCheckState | null;
    if (current?.state === 'running') return current;

    const session = await this.sessionRepo.findAnyActiveByOrgId(orgId);
    if (!session) throw new BadRequestException('Connect WhatsApp first to check numbers');

    const ids = resultIds?.length ? resultIds : undefined;
    // Earlier lookups that failed (no answer) get another try
    await this.prisma.scrapeResult.updateMany({
      where: { scrapeRunId, waExists: null, ...(ids && { id: { in: ids } }) },
      data: { waCheckedAt: null },
    });

    const state: WaCheckState = {
      state: 'running',
      token: randomUUID(),
      ...(ids && { resultIds: ids }),
      startedAt: new Date().toISOString(),
    };
    await this.prisma.scrapeRun.update({
      where: { id: scrapeRunId },
      data: { waCheck: state as unknown as Prisma.InputJsonObject },
    });
    await this.queue.publish<WaCheckJobData>(QUEUE_NAMES.SCRAPE_WA_CHECK, { scrapeRunId, token: state.token });
    return state;
  }

  async stop(orgId: string, scrapeRunId: string): Promise<void> {
    const run = await this.prisma.scrapeRun.findFirst({ where: { id: scrapeRunId, orgId } });
    if (!run) throw new NotFoundException('Scrape run not found');
    const current = run.waCheck as WaCheckState | null;
    if (current?.state === 'running') await this.finish(scrapeRunId, current, 'stopped');
  }

  /** One lookup, then queue the next. Called by the worker. */
  async step({ scrapeRunId, token }: WaCheckJobData): Promise<void> {
    const run = await this.prisma.scrapeRun.findUnique({ where: { id: scrapeRunId } });
    const current = run?.waCheck as WaCheckState | null | undefined;
    if (!run || current?.state !== 'running' || current.token !== token) return;

    const next = await this.prisma.scrapeResult.findFirst({
      where: {
        scrapeRunId,
        phone: { not: null },
        waCheckedAt: null,
        ...(current.resultIds && { id: { in: current.resultIds } }),
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, phone: true },
    });
    if (!next?.phone) {
      await this.finish(scrapeRunId, current, 'done');
      return;
    }

    // Answered before (memory cache or an earlier run) — no WhatsApp lookup needed
    const known = this.throttle.getCached(next.phone) ?? (await this.findPriorAnswer(run.orgId, next.phone));
    if (known !== undefined) {
      await this.save(next.id, known);
      await this.queueNext(scrapeRunId, token, 0);
      return;
    }

    const session = await this.sessionRepo.findAnyActiveByOrgId(run.orgId);
    if (!session) {
      await this.finish(scrapeRunId, current, 'no_session');
      return;
    }

    const slot = this.throttle.acquire(session.id);
    if (slot === 'minute_limit') {
      await this.queueNext(scrapeRunId, token, MINUTE_LIMIT_RETRY_SECONDS);
      return;
    }
    if (slot === 'day_limit') {
      await this.finish(scrapeRunId, current, 'day_limit');
      return;
    }

    const exists = await this.baileysManager.checkWhatsApp(session.id, next.phone);
    if (exists !== null) this.throttle.remember(next.phone, exists);
    await this.save(next.id, exists);
    await this.queueNext(scrapeRunId, token, LOOKUP_GAP_SECONDS);
  }

  private async findPriorAnswer(orgId: string, phone: string): Promise<boolean | undefined> {
    const prior = await this.prisma.scrapeResult.findFirst({
      where: {
        orgId,
        phone,
        waExists: { not: null },
        waCheckedAt: { gte: new Date(Date.now() - SEND_SAFETY_CONFIG.WA_CHECK_CACHE_TTL_MS) },
      },
      orderBy: { waCheckedAt: 'desc' },
      select: { waExists: true },
    });
    return prior?.waExists ?? undefined;
  }

  private save(resultId: string, exists: boolean | null) {
    return this.prisma.scrapeResult.update({
      where: { id: resultId },
      data: { waExists: exists, waCheckedAt: new Date() },
    });
  }

  private queueNext(scrapeRunId: string, token: string, delaySeconds: number) {
    const data: WaCheckJobData = { scrapeRunId, token };
    return delaySeconds > 0
      ? this.queue.publishDelayed(QUEUE_NAMES.SCRAPE_WA_CHECK, data, delaySeconds)
      : this.queue.publish(QUEUE_NAMES.SCRAPE_WA_CHECK, data);
  }

  private async finish(scrapeRunId: string, current: WaCheckState, state: WaCheckStateName) {
    const finished: WaCheckState = { ...current, state, finishedAt: new Date().toISOString() };
    // Only the chain that owns the token may finish it
    await this.prisma.scrapeRun.updateMany({
      where: { id: scrapeRunId, waCheck: { path: ['token'], equals: current.token } },
      data: { waCheck: finished as unknown as Prisma.InputJsonObject },
    });
    this.logger.log(`WhatsApp check for run ${scrapeRunId} ended: ${state}`);
  }
}
