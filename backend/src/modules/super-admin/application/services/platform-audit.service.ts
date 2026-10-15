import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PlatformActorType, PlatformAuditAction, Prisma } from '@prisma/client';
import {
  CreatePlatformAuditInput,
  PlatformAuditRepository,
} from '../../infrastructure/repositories/platform-audit.repository';

export interface AuditActor {
  id: string;
  email?: string;
}

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface PlatformAuditEntry {
  action: PlatformAuditAction;
  /** Omit (or null) for system actions and failed logins with no known account */
  actor?: AuditActor | null;
  targetType?: string;
  targetId?: string;
  orgId?: string | null;
  metadata?: Record<string, unknown>;
  meta?: RequestMeta;
}

/** Inline attempts before an entry is parked for the background retry. */
const INLINE_ATTEMPTS = 3;
const INLINE_BACKOFF_MS = [100, 400];
/** Bounded so a long outage can't exhaust memory; overflow is logged in full. */
const MAX_PENDING = 5_000;
const RETRY_INTERVAL_MS = 30_000;

/**
 * Records super admin actions in the platform audit log.
 *
 * Awaited by callers so the row is normally written before the response returns.
 * The action has already happened by then, so a failed write must not fail it —
 * instead the entry is retried inline, then parked and retried every 30s (keeping
 * its original timestamp) until the database takes it. Parked entries are flushed
 * on shutdown; anything still unwritten is logged in full at error level, so the
 * log pipeline remains the last-resort copy.
 */
@Injectable()
export class PlatformAuditService implements OnApplicationShutdown {
  private readonly logger = new Logger(PlatformAuditService.name);
  private readonly pending: CreatePlatformAuditInput[] = [];
  private flushing = false;

  constructor(private readonly auditRepo: PlatformAuditRepository) {}

  async record(entry: PlatformAuditEntry): Promise<void> {
    // Failed logins are attempts against the super admin portal even when no account matched
    const actorType =
      entry.actor || entry.action === PlatformAuditAction.SUPER_ADMIN_LOGIN_FAILED
        ? PlatformActorType.SUPER_ADMIN
        : PlatformActorType.SYSTEM;
    const row: CreatePlatformAuditInput = {
      actorType,
      actorId: entry.actor?.id ?? null,
      actorEmail: entry.actor?.email ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      orgId: entry.orgId ?? null,
      metadata: entry.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: entry.meta?.ipAddress ?? null,
      userAgent: entry.meta?.userAgent ?? null,
      createdAt: new Date(),
    };

    for (let attempt = 1; attempt <= INLINE_ATTEMPTS; attempt++) {
      try {
        await this.auditRepo.create(row);
        return;
      } catch (err) {
        if (attempt === INLINE_ATTEMPTS) {
          this.park(row, err as Error);
          return;
        }
        await sleep(INLINE_BACKOFF_MS[attempt - 1] ?? 400);
      }
    }
  }

  /** Entries waiting for the database — exposed for health checks and tests. */
  pendingCount(): number {
    return this.pending.length;
  }

  /** Background retry of parked entries, oldest first; stops at the first failure. */
  @Interval(RETRY_INTERVAL_MS)
  async flushPending(): Promise<void> {
    if (this.flushing || this.pending.length === 0) return;
    this.flushing = true;
    let written = 0;
    try {
      while (this.pending.length > 0) {
        await this.auditRepo.create(this.pending[0]);
        this.pending.shift();
        written++;
      }
    } catch (err) {
      this.logger.warn(
        `Audit retry: database still failing, ${this.pending.length} entr${this.pending.length === 1 ? 'y' : 'ies'} pending — ${(err as Error).message}`,
      );
    } finally {
      this.flushing = false;
      if (written > 0) this.logger.log(`Audit retry: wrote ${written} delayed entr${written === 1 ? 'y' : 'ies'}`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.flushPending();
    for (const row of this.pending) {
      this.logger.error(`PLATFORM AUDIT LOST ON SHUTDOWN action=${row.action}`, JSON.stringify(row));
    }
  }

  private park(row: CreatePlatformAuditInput, err: Error): void {
    this.logger.error(
      `PLATFORM AUDIT WRITE FAILED action=${row.action} actor=${row.actorId ?? '-'} ` +
        `target=${row.targetType ?? '-'}:${row.targetId ?? '-'} — queued for retry: ${err.message}`,
      JSON.stringify(row),
    );
    if (this.pending.length >= MAX_PENDING) {
      const dropped = this.pending.shift();
      this.logger.error('PLATFORM AUDIT BUFFER FULL — oldest entry dropped (logged above)', JSON.stringify(dropped));
    }
    this.pending.push(row);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
