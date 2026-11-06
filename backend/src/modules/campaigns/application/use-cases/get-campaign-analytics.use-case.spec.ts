import { CampaignStatus, CampaignRecipientStatus, WhatsAppSessionStatus } from '@prisma/client';
import { CampaignRecipientRepository } from '../../infrastructure/repositories/campaign-recipient.repository';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { GetCampaignAnalyticsUseCase } from './get-campaign-analytics.use-case';

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
    expect(result.batches).toEqual([
      expect.objectContaining({
        batchNumber: 1,
        counts: expect.objectContaining({
          sent: 1,
          failed: 1,
        }),
        issues: [
          'WhatsApp session is disconnected',
          '1 failed: Session not connected',
        ],
      }),
    ]);
  });
});
