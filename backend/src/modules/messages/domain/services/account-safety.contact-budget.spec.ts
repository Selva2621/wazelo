import { CampaignRecipientStatus, SequenceRecipientStatus, SequenceStatus } from '@prisma/client';
import { AccountSafetyService } from './account-safety.service';

// Noon UTC: inside sending hours, so only the per-contact limit can hold a message
const NOW = new Date('2026-10-20T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

function setup(
  recentSends: Date[],
  recipientStatus?: SequenceRecipientStatus,
  orgTimezone = 'UTC',
  campaignTimezone?: string,
) {
  const prisma = {
    whatsAppSession: { findUnique: jest.fn(async () => ({ linkedAt: new Date('2025-01-01'), createdAt: new Date('2025-01-01'), sendingPausedUntil: null, sendingPausedReason: null })) },
    organization: { findUnique: jest.fn(async () => ({ timezone: orgTimezone })) },
    campaign: { findFirst: jest.fn(async () => campaignTimezone ? { timezone: campaignTimezone } : null) },
    message: {
      count: jest.fn(async () => 0),
      findFirst: jest.fn(async () => ({ id: 'inbound' })), // warm contact
      findMany: jest.fn(async () => recentSends.map((sentAt) => ({ sentAt }))),
    },
    $queryRaw: jest.fn(async () => [{ count: 0 }]),
    contact: { findFirst: jest.fn(async () => null) },
    campaignSequence: { findUnique: jest.fn(async () => ({ status: SequenceStatus.ACTIVE })) },
    sequenceRecipient: { findFirst: jest.fn(async () => (recipientStatus ? { status: recipientStatus } : null)) },
  };
  return new AccountSafetyService(prisma as never, {} as never);
}

describe('Per-contact limit on business-started messages', () => {
  it('sends when the contact got fewer than 2 such messages in the last 24h', async () => {
    const decision = await setup([hoursAgo(3)]).checkBulkSend('o1', 's1', '+919000000001', NOW);
    expect(decision.allowed).toBe(true);
  });

  it('holds the third one until the oldest is 24h old', async () => {
    const decision = await setup([hoursAgo(20), hoursAgo(2)]).checkBulkSend('o1', 's1', '+919000000001', NOW);
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.retryAt.getTime()).toBeGreaterThanOrEqual(hoursAgo(20).getTime() + 24 * 3_600_000);
      expect(decision.retryAt.getTime()).toBeLessThan(hoursAgo(20).getTime() + 25 * 3_600_000);
    }
  });

  it('uses the campaign timezone for its sending window instead of the organization timezone', async () => {
    const now = new Date('2026-11-06T04:02:00.000Z');
    const decision = await setup([], undefined, 'UTC', 'Asia/Calcutta')
      .checkBulkSend('o1', 's1', '+919000000001', now, 'campaign-1');

    expect(decision).toEqual({ allowed: true });
  });
});

describe('Queued sequence step after the contact left', () => {
  const message = { contactPhone: '+919000000001', metadata: { sequenceId: 'seq1' } };

  it('is dropped once the contact exited (e.g. replied)', async () => {
    const relevance = await setup([], SequenceRecipientStatus.EXITED).checkBulkRelevance('o1', message, NOW);
    expect(relevance).toEqual(expect.objectContaining({ action: 'drop', recipientStatus: CampaignRecipientStatus.SKIPPED }));
  });

  it('still goes out for an active (or just-completed) recipient', async () => {
    expect((await setup([], SequenceRecipientStatus.ACTIVE).checkBulkRelevance('o1', message, NOW)).action).toBe('send');
    expect((await setup([], SequenceRecipientStatus.COMPLETED).checkBulkRelevance('o1', message, NOW)).action).toBe('send');
  });
});
