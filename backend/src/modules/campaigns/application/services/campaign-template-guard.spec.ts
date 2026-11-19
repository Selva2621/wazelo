import {
  CAMPAIGN_TEMPLATE_MISSING_REASON,
  campaignTemplateProblem,
  readCampaignTemplatePlan,
} from './campaign-template-guard';

function prismaWith(opts: { cloudNumbers: number; template: object | null }) {
  return {
    whatsAppSession: { count: jest.fn().mockResolvedValue(opts.cloudNumbers) },
    messageTemplate: { findFirst: jest.fn().mockResolvedValue(opts.template) },
  } as any;
}

const withTemplate = {
  sessionId: 's1',
  channel: 'WHATSAPP',
  metadata: { sessionPool: ['s1', 's2'], cloudTemplate: { templateId: 't1', params: ['a'] } },
};

describe('readCampaignTemplatePlan', () => {
  it('reads the campaign template plan', () => {
    expect(readCampaignTemplatePlan(withTemplate.metadata)).toEqual({
      templateId: 't1',
      params: ['a'],
      headerImageUrl: undefined,
    });
  });

  it('returns null without a template', () => {
    expect(readCampaignTemplatePlan({ sessionPool: ['s1'] })).toBeNull();
    expect(readCampaignTemplatePlan(null)).toBeNull();
    expect(readCampaignTemplatePlan({ cloudTemplate: { templateId: '' } })).toBeNull();
  });
});

describe('campaignTemplateProblem', () => {
  it('blocks when an official number is in the pool and the template is gone', async () => {
    const prisma = prismaWith({ cloudNumbers: 1, template: null });
    await expect(campaignTemplateProblem(prisma, withTemplate, 'org')).resolves.toBe(
      CAMPAIGN_TEMPLATE_MISSING_REASON,
    );
    // Same rule as create: approved and known to Meta
    expect(prisma.messageTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 't1', orgId: 'org', status: 'APPROVED', deletedAt: null }),
      }),
    );
  });

  it('allows when the template is still approved', async () => {
    const prisma = prismaWith({ cloudNumbers: 1, template: { name: 'offer' } });
    await expect(campaignTemplateProblem(prisma, withTemplate, 'org')).resolves.toBeNull();
  });

  it('allows QR-only pools: they send the text version', async () => {
    const prisma = prismaWith({ cloudNumbers: 0, template: null });
    await expect(campaignTemplateProblem(prisma, withTemplate, 'org')).resolves.toBeNull();
    expect(prisma.messageTemplate.findFirst).not.toHaveBeenCalled();
  });

  it('ignores campaigns without a template and email campaigns', async () => {
    const prisma = prismaWith({ cloudNumbers: 1, template: null });
    await expect(
      campaignTemplateProblem(prisma, { ...withTemplate, metadata: { sessionPool: ['s1'] } }, 'org'),
    ).resolves.toBeNull();
    await expect(
      campaignTemplateProblem(prisma, { ...withTemplate, channel: 'EMAIL' }, 'org'),
    ).resolves.toBeNull();
    expect(prisma.whatsAppSession.count).not.toHaveBeenCalled();
  });
});
