import { CampaignRecipientRepository } from '../../infrastructure/repositories/campaign-recipient.repository';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { ListCampaignsUseCase } from './list-campaigns.use-case';

describe('ListCampaignsUseCase', () => {
  it('calculates processed progress from recipient statuses instead of cached counters', async () => {
    const campaign = {
      id: 'campaign-1',
      totalRecipients: 4,
      sentCount: 5,
      failedCount: 0,
    };
    const campaignRepo = {
      findByOrgPaginated: jest
        .fn()
        .mockResolvedValue({ campaigns: [campaign], total: 1 }),
    } as unknown as CampaignRepository;
    const recipientRepo = {
      countByStatusForCampaigns: jest.fn().mockResolvedValue(
        new Map([
          [
            campaign.id,
            {
              pending: 0,
              queued: 0,
              sent: 1,
              delivered: 2,
              failed: 1,
              skipped: 0,
            },
          ],
        ]),
      ),
    } as unknown as CampaignRecipientRepository;

    const result = await new ListCampaignsUseCase(
      campaignRepo,
      recipientRepo,
    ).execute('org-1', {});

    expect(result.data[0]).toEqual({
      ...campaign,
      processedRecipientCount: 4,
    });
    expect(recipientRepo.countByStatusForCampaigns).toHaveBeenCalledWith([
      campaign.id,
    ]);
  });
});
