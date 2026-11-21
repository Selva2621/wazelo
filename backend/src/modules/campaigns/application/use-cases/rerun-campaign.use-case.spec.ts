import { BadRequestException } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { RerunCampaignUseCase, rerunName } from './rerun-campaign.use-case';

describe('rerunName', () => {
  it('adds a single (rerun) suffix', () => {
    expect(rerunName('Diwali offer')).toBe('Diwali offer (rerun)');
    expect(rerunName('Diwali offer (rerun)')).toBe('Diwali offer (rerun)');
  });
});

describe('RerunCampaignUseCase', () => {
  const source = {
    id: 'c1',
    name: 'Diwali offer',
    status: CampaignStatus.FAILED,
    sessionId: 's1',
    messageType: 'TEXT',
    messageBody: 'Hi {{contact.name}}',
    audienceType: 'ALL',
    audienceFilters: null,
    timezone: 'Asia/Kolkata',
    productId: null,
  };

  function setup(status: CampaignStatus = CampaignStatus.FAILED) {
    const campaignRepo = { findByIdAndOrg: jest.fn(async () => ({ ...source, status })) };
    const createCampaign = { execute: jest.fn(async () => ({ campaign: { id: 'c2' } })) };
    const executeCampaign = { execute: jest.fn(async () => ({ id: 'c2', status: 'RUNNING' })) };
    const useCase = new RerunCampaignUseCase(
      campaignRepo as never,
      createCampaign as never,
      executeCampaign as never,
    );
    return { useCase, createCampaign, executeCampaign };
  }

  it('copies the campaign and starts the copy', async () => {
    const { useCase, createCampaign, executeCampaign } = setup();
    const result = await useCase.execute('c1', 'o1', 'u1', 'ip', 'ua');

    expect(createCampaign.execute).toHaveBeenCalledWith(
      'o1',
      'u1',
      expect.objectContaining({
        name: 'Diwali offer (rerun)',
        sessionId: 's1',
        messageBody: 'Hi {{contact.name}}',
        audienceType: 'ALL',
      }),
      'ip',
      'ua',
    );
    expect(executeCampaign.execute).toHaveBeenCalledWith('c2', 'o1', 'u1', 'ip', 'ua');
    expect(result).toEqual({ id: 'c2', status: 'RUNNING' });
  });

  it('refuses a campaign that has not finished', async () => {
    const { useCase, createCampaign } = setup(CampaignStatus.RUNNING);
    await expect(useCase.execute('c1', 'o1', 'u1', 'ip', 'ua')).rejects.toBeInstanceOf(BadRequestException);
    expect(createCampaign.execute).not.toHaveBeenCalled();
  });
});
