import { CampaignRepliesService } from './campaign-replies.service';

function setup(recipients: Array<{ id: string; campaignId: string }>, alreadyMarked = new Set<string>()) {
  const prisma = {
    campaignRecipient: {
      findMany: jest.fn(async () => recipients),
      updateMany: jest.fn(async ({ where }: { where: { id: string } }) => ({ count: alreadyMarked.has(where.id) ? 0 : 1 })),
    },
    campaign: { update: jest.fn(async () => ({})) },
  };
  return { service: new CampaignRepliesService(prisma as never), prisma };
}

describe('CampaignRepliesService', () => {
  it('marks the recipient replied and counts it on the campaign', async () => {
    const { service, prisma } = setup([{ id: 'r1', campaignId: 'c1' }]);
    expect(await service.markReplied('o1', '+919000000001', new Date())).toBe(1);
    expect(prisma.campaign.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { repliedCount: { increment: 1 } } });
  });

  it('only looks at campaigns that reached this contact in the last week, not yet replied', async () => {
    const { service, prisma } = setup([]);
    const at = new Date('2026-10-20T12:00:00Z');
    await service.markReplied('o1', '919000000001', at);
    const where = (prisma.campaignRecipient.findMany.mock.calls[0] as unknown as [{ where: Record<string, any> }])[0].where;
    expect(where.contactPhone).toEqual({ in: ['919000000001', '+919000000001'] });
    expect(where.repliedAt).toBeNull();
    expect(where.message.sentAt.gte.getTime()).toBe(at.getTime() - 7 * 24 * 3_600_000);
  });

  it('counts a reply once even if another message marked it first', async () => {
    const { service, prisma } = setup([{ id: 'r1', campaignId: 'c1' }], new Set(['r1']));
    expect(await service.markReplied('o1', '+919000000001', new Date())).toBe(0);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });
});
