import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';

export type PlatformActivityType = 'ORG_SIGNUP' | 'SUBSCRIPTION' | 'TICKET';

export interface PlatformActivityItem {
  id: string;
  type: PlatformActivityType;
  /** Present for SUBSCRIPTION items */
  status?: SubscriptionStatus;
  text: string;
  orgId: string | null;
  at: Date;
}

const STATUS_VERB: Record<SubscriptionStatus, string> = {
  TRIAL: 'started a trial',
  ACTIVE: 'became a paying customer',
  PAST_DUE: 'is past due',
  GRACE_PERIOD: 'entered the grace period',
  EXPIRED: 'subscription expired',
  CANCELLED: 'cancelled their subscription',
};

/** Recent signups, subscription changes and tickets across all orgs, newest first. */
@Injectable()
export class GetPlatformActivityUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(limit = 10): Promise<{ items: PlatformActivityItem[] }> {
    const [orgs, events, tickets] = await Promise.all([
      this.platformRepo.recentOrgs(limit),
      this.platformRepo.recentSubscriptionEvents(limit),
      this.platformRepo.recentTickets(limit),
    ]);

    const names = await this.platformRepo.orgNames([...new Set(events.map((e) => e.orgId))]);

    const items: PlatformActivityItem[] = [
      ...orgs.map((o) => ({
        id: `org:${o.id}`,
        type: 'ORG_SIGNUP' as const,
        text: `${o.name} signed up`,
        orgId: o.id,
        at: o.createdAt,
      })),
      ...events.map((e) => ({
        id: `sub:${e.id}`,
        type: 'SUBSCRIPTION' as const,
        status: e.newStatus,
        text: `${names.get(e.orgId) ?? 'An organization'} ${STATUS_VERB[e.newStatus]}`,
        orgId: e.orgId,
        at: e.createdAt,
      })),
      ...tickets.map((t) => ({
        id: `ticket:${t.id}`,
        type: 'TICKET' as const,
        text: `${t.organization?.name ?? 'An organization'} opened a ticket: ${t.title}`,
        orgId: t.organization?.id ?? null,
        at: t.createdAt,
      })),
    ];

    items.sort((a, b) => b.at.getTime() - a.at.getTime());
    return { items: items.slice(0, limit) };
  }
}
