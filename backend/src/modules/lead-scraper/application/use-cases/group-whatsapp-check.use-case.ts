import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { QUEUE_NAMES, SEND_SAFETY_CONFIG } from '@/common/constants';
import { WhatsAppCheckThrottleService } from '../../domain/services/whatsapp-check-throttle.service';
import type { WaCheckStateName } from './whatsapp-check-run.use-case';

export interface GroupWaCheckState {
  state: WaCheckStateName;
  /** Identifies the current job chain; a stale chain from an earlier start stops itself */
  token: string;
  startedAt: string;
  finishedAt?: string;
}

export interface GroupWaCheckJobData {
  groupId: string;
  token: string;
}

/** Gap between live lookups: keeps well under the per-minute cap */
const LOOKUP_GAP_SECONDS = 7;
/** Wait when the per-minute cap is hit */
const MINUTE_LIMIT_RETRY_SECONDS = 15;

/**
 * Which group members still need a lookup in the run that started at `runStart`:
 * never checked / failed / older than 30 days, and not already tried in this run.
 * (Explicit null branches: a NOT on a nullable column would drop null rows.)
 */
export function contactsToCheckWhere(groupId: string, orgId: string, runStart: Date, now = new Date()): Prisma.ContactWhereInput {
  const staleBefore = new Date(now.getTime() - SEND_SAFETY_CONFIG.WA_CHECK_CACHE_TTL_MS);
  return {
    orgId,
    deletedAt: null,
    mergedIntoId: null,
    savedGroupMemberships: { some: { groupId } },
    AND: [
      { OR: [{ waCheckedAt: null }, { waExists: null }, { waCheckedAt: { lt: staleBefore } }] },
      { OR: [{ waCheckedAt: null }, { waCheckedAt: { lt: runStart } }] },
    ],
  };
}

/**
 * Checks a saved group's numbers against WhatsApp in the background, one lookup
 * per job (each job queues the next, so it survives restarts). Answers are stored
 * on the contact; WhatsApp campaigns then skip numbers that aren't on WhatsApp,
 * which keeps undelivered sends (a ban signal) out of the campaign.
 *
 * Uses the same per-number lookup caps as the lead-scraper check (one shared
 * throttle), and reuses answers from earlier checks for 30 days.
 */
@Injectable()
export class GroupWhatsAppCheckUseCase {
  private readonly logger = new Logger(GroupWhatsAppCheckUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly baileysManager: BaileysConnectionManager,
    private readonly throttle: WhatsAppCheckThrottleService,
  ) {}

  async start(orgId: string, groupId: string): Promise<GroupWaCheckState> {
    const group = await this.prisma.savedContactGroup.findFirst({
      where: { id: groupId, orgId, deletedAt: null },
      select: { id: true, waCheck: true },
    });
    if (!group) throw new NotFoundException('Contact group not found');

    const current = group.waCheck as GroupWaCheckState | null;
    if (current?.state === 'running') return current;

    const session = await this.sessionRepo.findAnyActiveByOrgId(orgId);
    if (!session) throw new BadRequestException('Connect WhatsApp first to check numbers');

    const state: GroupWaCheckState = {
      state: 'running',
      token: randomUUID(),
      startedAt: new Date().toISOString(),
    };
    await this.prisma.savedContactGroup.update({
      where: { id: groupId },
      data: { waCheck: state as unknown as Prisma.InputJsonObject },
    });
    await this.queue.publish<GroupWaCheckJobData>(QUEUE_NAMES.GROUP_WA_CHECK, { groupId, token: state.token });
    return state;
  }

  async stop(orgId: string, groupId: string): Promise<void> {
    const group = await this.prisma.savedContactGroup.findFirst({
      where: { id: groupId, orgId },
      select: { waCheck: true },
    });
    if (!group) throw new NotFoundException('Contact group not found');
    const current = group.waCheck as GroupWaCheckState | null;
    if (current?.state === 'running') await this.finish(groupId, current, 'stopped');
  }

  /** One lookup, then queue the next. Called by the worker. */
  async step({ groupId, token }: GroupWaCheckJobData): Promise<void> {
    const group = await this.prisma.savedContactGroup.findUnique({
      where: { id: groupId },
      select: { id: true, orgId: true, deletedAt: true, waCheck: true },
    });
    const current = group?.waCheck as GroupWaCheckState | null | undefined;
    if (!group || current?.state !== 'running' || current.token !== token) return;
    if (group.deletedAt) {
      await this.finish(groupId, current, 'stopped');
      return;
    }

    const next = await this.prisma.contact.findFirst({
      where: contactsToCheckWhere(groupId, group.orgId, new Date(current.startedAt)),
      orderBy: { id: 'asc' },
      select: { id: true, phoneNumber: true },
    });
    if (!next) {
      await this.finish(groupId, current, 'done');
      return;
    }

    // Answered before (memory cache or a lead-scraper check): no WhatsApp lookup needed
    const known = this.throttle.getCached(next.phoneNumber) ?? (await this.findPriorAnswer(group.orgId, next.phoneNumber));
    if (known !== undefined) {
      await this.save(next.id, known);
      await this.queueNext(groupId, token, 0);
      return;
    }

    const session = await this.sessionRepo.findAnyActiveByOrgId(group.orgId);
    if (!session) {
      await this.finish(groupId, current, 'no_session');
      return;
    }

    const slot = this.throttle.acquire(session.id);
    if (slot === 'minute_limit') {
      await this.queueNext(groupId, token, MINUTE_LIMIT_RETRY_SECONDS);
      return;
    }
    if (slot === 'day_limit') {
      await this.finish(groupId, current, 'day_limit');
      return;
    }

    const exists = await this.baileysManager.checkWhatsApp(session.id, next.phoneNumber);
    if (exists !== null) this.throttle.remember(next.phoneNumber, exists);
    await this.save(next.id, exists);
    await this.queueNext(groupId, token, LOOKUP_GAP_SECONDS);
  }

  /** A fresh answer for this number from a lead-scraper check */
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

  private save(contactId: string, exists: boolean | null) {
    return this.prisma.contact.update({
      where: { id: contactId },
      data: { waExists: exists, waCheckedAt: new Date() },
    });
  }

  private queueNext(groupId: string, token: string, delaySeconds: number) {
    const data: GroupWaCheckJobData = { groupId, token };
    return delaySeconds > 0
      ? this.queue.publishDelayed(QUEUE_NAMES.GROUP_WA_CHECK, data, delaySeconds)
      : this.queue.publish(QUEUE_NAMES.GROUP_WA_CHECK, data);
  }

  private async finish(groupId: string, current: GroupWaCheckState, state: WaCheckStateName) {
    const finished: GroupWaCheckState = { ...current, state, finishedAt: new Date().toISOString() };
    // Only the chain that owns the token may finish it
    await this.prisma.savedContactGroup.updateMany({
      where: { id: groupId, waCheck: { path: ['token'], equals: current.token } },
      data: { waCheck: finished as unknown as Prisma.InputJsonObject },
    });
    this.logger.log(`WhatsApp check for group ${groupId} ended: ${state}`);
  }
}
