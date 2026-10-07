import { Injectable, Logger } from '@nestjs/common';
import { PlatformActorType, PlatformAuditAction, Prisma } from '@prisma/client';
import { PlatformAuditRepository } from '../../infrastructure/repositories/platform-audit.repository';

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

/**
 * Records super admin actions in the platform audit log.
 *
 * Awaited by callers so the row is written before the response returns.
 * A failed write never fails the action that already happened, but it is
 * logged at error level with the full entry — never swallowed silently.
 */
@Injectable()
export class PlatformAuditService {
  private readonly logger = new Logger(PlatformAuditService.name);

  constructor(private readonly auditRepo: PlatformAuditRepository) {}

  async record(entry: PlatformAuditEntry): Promise<void> {
    // Failed logins are attempts against the super admin portal even when no account matched
    const actorType =
      entry.actor || entry.action === PlatformAuditAction.SUPER_ADMIN_LOGIN_FAILED
        ? PlatformActorType.SUPER_ADMIN
        : PlatformActorType.SYSTEM;
    try {
      await this.auditRepo.create({
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
      });
    } catch (err) {
      this.logger.error(
        `PLATFORM AUDIT WRITE FAILED action=${entry.action} actor=${entry.actor?.id ?? '-'} ` +
          `target=${entry.targetType ?? '-'}:${entry.targetId ?? '-'} — ${(err as Error).message}`,
        JSON.stringify({ ...entry, meta: undefined }),
      );
    }
  }
}
