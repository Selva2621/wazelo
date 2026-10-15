import { Injectable } from '@nestjs/common';
import { OrgStatus } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

const CACHE_TTL_MS = 30_000;

/**
 * Answers "is this org suspended?" for every enforcement point (API guard,
 * logins, sockets, send workers, inbound automation).
 *
 * Cached per process for 30s; `invalidate()` clears it immediately on the
 * instance that suspends/reactivates. Other instances pick the change up
 * within the TTL — sessions and sockets are revoked separately, so a
 * suspended org cannot keep acting in that window beyond in-flight requests.
 */
@Injectable()
export class OrgStatusService {
  private readonly cache = new Map<string, { suspended: boolean; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async isSuspended(orgId: string | null | undefined): Promise<boolean> {
    if (!orgId) return false;

    const cached = this.cache.get(orgId);
    if (cached && cached.expiresAt > Date.now()) return cached.suspended;

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { status: true, deletedAt: true },
    });
    // A deleted org (restorable for 30 days) is locked out exactly like a suspended one
    const suspended = org?.status === OrgStatus.SUSPENDED || !!org?.deletedAt;
    this.cache.set(orgId, { suspended, expiresAt: Date.now() + CACHE_TTL_MS });
    return suspended;
  }

  invalidate(orgId: string): void {
    this.cache.delete(orgId);
  }
}
