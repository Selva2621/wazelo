import { CampaignAudienceType } from '@prisma/client';
import { AudienceResolverService } from './audience-resolver.service';

describe('AudienceResolverService', () => {
  it('resolves manually selected contacts within the campaign org', async () => {
    const contactIds = [
      'c4a760c0-b079-4d4a-a0dc-0f97c47e6311',
      'c4a760c0-b079-4d4a-a0dc-0f97c47e6312',
    ];
    const findMany = jest.fn().mockResolvedValue([
      { id: contactIds[0], phoneNumber: '+14155550123' },
      { id: contactIds[1], phoneNumber: '+14155550124' },
    ]);
    const resolver = new AudienceResolverService({
      contact: { findMany },
    } as never);

    const result = await resolver.resolveAudience('org-1', CampaignAudienceType.FILTERED, {
      contactIds,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: 'org-1',
          deletedAt: null,
          mergedIntoId: null,
          optedOut: false,
          id: { in: contactIds },
        }),
      }),
    );
    expect(result).toEqual({
      contacts: [
        { id: contactIds[0], phoneNumber: '+14155550123' },
        { id: contactIds[1], phoneNumber: '+14155550124' },
      ],
      total: 2,
    });
  });

  it('intersects manually selected contacts with the other audience filters', async () => {
    const contactIds = [
      'c4a760c0-b079-4d4a-a0dc-0f97c47e6311',
      'c4a760c0-b079-4d4a-a0dc-0f97c47e6312',
    ];
    const contactFindMany = jest.fn().mockResolvedValue([]);
    const scrapeResultFindMany = jest.fn().mockResolvedValue([
      { contactId: contactIds[1] },
      { contactId: 'c4a760c0-b079-4d4a-a0dc-0f97c47e6313' },
    ]);
    const resolver = new AudienceResolverService({
      contact: { findMany: contactFindMany },
      scrapeResult: { findMany: scrapeResultFindMany },
    } as never);

    await resolver.resolveAudience('org-1', CampaignAudienceType.FILTERED, {
      contactIds,
      scrapeRunId: 'run-1',
    });

    expect(contactFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: [contactIds[1]] } }),
      }),
    );
  });

  it('unions manually selected contacts with org-scoped saved groups', async () => {
    const contactIds = ['c4a760c0-b079-4d4a-a0dc-0f97c47e6311'];
    const contactFindMany = jest.fn().mockResolvedValue([]);
    const resolver = new AudienceResolverService({
      contact: { findMany: contactFindMany },
    } as never);

    await resolver.resolveAudience('org-1', CampaignAudienceType.FILTERED, {
      contactIds,
      contactGroupIds: ['d4a760c0-b079-4d4a-a0dc-0f97c47e6311'],
      leadStatuses: ['NEW'],
    });

    expect(contactFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { id: { in: contactIds } },
                {
                  savedGroupMemberships: {
                    some: {
                      groupId: { in: ['d4a760c0-b079-4d4a-a0dc-0f97c47e6311'] },
                      group: { orgId: 'org-1' },
                    },
                  },
                },
              ],
            },
          ],
          leadStatus: { in: ['NEW'] },
        }),
      }),
    );
  });
});
