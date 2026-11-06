import { CampaignStatus, CampaignRecipientStatus, WhatsAppSessionStatus } from '@prisma/client';
import { CampaignRecipientRepository, type CampaignBatchProgress } from '../../infrastructure/repositories/campaign-recipient.repository';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { GetCampaignAnalyticsUseCase, summarizeBatches } from './get-campaign-analytics.use-case';

describe('GetCampaignAnalyticsUseCase', () => {
  it('returns elapsed active time and per-batch session issues', async () => {
    const startedAt = new Date('2026-11-06T04:00:00.000Z');
    const pausedAt = new Date('2026-11-06T04:30:00.000Z');
    const resumedAt = new Date('2026-11-06T05:00:00.000Z');
    const completedAt = new Date('2026-11-06T05:15:00.000Z');
    const campaignRepo = {
      findByIdAndOrg: jest.fn().mockResolvedValue({
        id: 'campaign-1',
        name: 'Campaign',
        status: CampaignStatus.COMPLETED,
        startedAt,
        completedAt,
        updatedAt: completedAt,
        totalRecipients: 2,
        sentCount: 1,
        deliveredCount: 0,
        failedCount: 1,
        readCount: 0,
      }),
      findStatusEvents: jest.fn().mockResolvedValue([
        { newStatus: CampaignStatus.RUNNING, createdAt: startedAt },
        { newStatus: CampaignStatus.PAUSED, createdAt: pausedAt },
        { newStatus: CampaignStatus.RUNNING, createdAt: resumedAt },
        { newStatus: CampaignStatus.COMPLETED, createdAt: completedAt },
      ]),
    } as unknown as CampaignRepository;
    const recipientRepo = {
      countByStatus: jest.fn().mockResolvedValue({
        pending: 0,
        queued: 0,
        sent: 1,
        delivered: 0,
        failed: 1,
        skipped: 0,
      }),
      getBatchProgress: jest.fn().mockResolvedValue([
        {
          batchNumber: 1,
          sessionId: 'session-1',
          sessionPhoneNumber: '+15555550123',
          sessionStatus: WhatsAppSessionStatus.DISCONNECTED,
          lastHeartbeatAt: null,
          sendingPausedUntil: null,
          sendingPausedReason: null,
          counts: {
            pending: 0,
            queued: 0,
            sent: 1,
            delivered: 0,
            failed: 1,
            skipped: 0,
          },
          failureReasons: [{ reason: 'Session not connected', count: 1 }],
        },
      ]),
    } as unknown as CampaignRecipientRepository;

    const result = await new GetCampaignAnalyticsUseCase(campaignRepo, recipientRepo)
      .execute('campaign-1', 'org-1');

    expect(result.timing.elapsedMs).toBe(45 * 60 * 1000);
    // A finished batch is not flagged for its (now disconnected) number
    expect(result.batches).toEqual([
      expect.objectContaining({
        batchNumber: 1,
        state: 'done',
        issue: null,
        counts: expect.objectContaining({ sent: 1, failed: 1 }),
        topFailures: [{ reason: 'Session not connected', count: 1 }],
        issues: ['1 failed: Session not connected'],
      }),
    ]);
  });
});

describe('summarizeBatches', () => {
  const now = new Date('2026-11-06T10:00:00.000Z');
  const row = (overrides: Partial<CampaignBatchProgress> & { batchNumber: number }): CampaignBatchProgress => ({
    sessionId: 'A',
    sessionPhoneNumber: '+10000000001',
    sessionStatus: WhatsAppSessionStatus.CONNECTED,
    lastHeartbeatAt: now,
    sendingPausedUntil: null,
    sendingPausedReason: null,
    counts: { pending: 0, queued: 0, sent: 0, delivered: 0, failed: 0, skipped: 0 },
    failureReasons: [],
    ...overrides,
  });
  const counts = (c: Partial<CampaignBatchProgress['counts']>) =>
    ({ pending: 0, queued: 0, sent: 0, delivered: 0, failed: 0, skipped: 0, ...c });

  it('marks the first unfinished batch per number as sending and later ones as waiting', () => {
    const result = summarizeBatches([
      row({ batchNumber: 1, sessionId: 'A', counts: counts({ sent: 100 }) }),
      row({ batchNumber: 2, sessionId: 'B', counts: counts({ pending: 50, queued: 1, sent: 49 }) }),
      row({ batchNumber: 3, sessionId: 'A', counts: counts({ pending: 100 }) }),
      row({ batchNumber: 4, sessionId: 'A', counts: counts({ pending: 100 }) }),
    ], CampaignStatus.RUNNING, now);

    expect(result.map((b) => b.state)).toEqual(['done', 'sending', 'sending', 'waiting']);
  });

  it('shows unfinished batches as paused while the campaign is paused, stopped once it ended', () => {
    const rows = [row({ batchNumber: 1, counts: counts({ pending: 5, sent: 5 }) })];
    expect(summarizeBatches(rows, CampaignStatus.PAUSED, now)[0].state).toBe('paused');
    expect(summarizeBatches(rows, CampaignStatus.CANCELLED, now)[0].state).toBe('stopped');
  });

  it('flags an unfinished batch whose number dropped as blocked', () => {
    const [batch] = summarizeBatches([
      row({ batchNumber: 1, sessionStatus: WhatsAppSessionStatus.DISCONNECTED, counts: counts({ pending: 10 }) }),
    ], CampaignStatus.PAUSED, now);
    expect(batch).toMatchObject({ state: 'blocked', issue: 'Number disconnected' });
  });

  it('merges rows of one batch split across numbers into a single row', () => {
    const result = summarizeBatches([
      row({ batchNumber: 1, sessionId: 'A', sessionStatus: WhatsAppSessionStatus.DISCONNECTED, counts: counts({ sent: 40 }) }),
      row({ batchNumber: 1, sessionId: 'B', sessionPhoneNumber: '+10000000002', counts: counts({ pending: 60 }) }),
    ], CampaignStatus.RUNNING, now);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      sessionId: 'B',
      sessionPhoneNumber: '+10000000002',
      counts: expect.objectContaining({ sent: 40, pending: 60 }),
      issue: null,
    });
  });

  it('keeps only the three most common failure reasons', () => {
    const [batch] = summarizeBatches([
      row({
        batchNumber: 1,
        counts: counts({ failed: 10 }),
        failureReasons: [
          { reason: 'a', count: 1 }, { reason: 'b', count: 5 },
          { reason: 'c', count: 2 }, { reason: 'd', count: 2 },
        ],
      }),
    ], CampaignStatus.COMPLETED, now);
    expect(batch.topFailures.map((f) => f.reason)).toEqual(['b', 'c', 'd']);
  });
});
