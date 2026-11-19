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
                      group: { orgId: 'org-1', deletedAt: null },
                    },
                  },
                },
              ],
            },
            // WhatsApp campaigns skip numbers a check found are not on WhatsApp
            { OR: [{ waExists: null }, { waExists: true }] },
          ],
          leadStatus: { in: ['NEW'] },
        }),
      }),
    );
  });

  it('keeps unchecked numbers but drops ones known not to be on WhatsApp (preview too)', async () => {
    const count = jest.fn().mockResolvedValue(3);
    const resolver = new AudienceResolverService({ contact: { count } } as never);

    await resolver.previewAudienceCount('org-1', CampaignAudienceType.ALL, undefined, 'WHATSAPP');
    expect(count.mock.calls[0][0].where.AND).toContainEqual({ OR: [{ waExists: null }, { waExists: true }] });

    // Email campaigns don't care whether a number is on WhatsApp
    await resolver.previewAudienceCount('org-1', CampaignAudienceType.ALL, undefined, 'EMAIL');
    expect(JSON.stringify(count.mock.calls[1][0].where)).not.toContain('waExists');
  });

  it('counts audience members a check found are not on WhatsApp (for the preview note)', async () => {
    const count = jest.fn().mockResolvedValue(1);
    const resolver = new AudienceResolverService({ contact: { count } } as never);

    await expect(
      resolver.countNotOnWhatsApp('org-1', CampaignAudienceType.FILTERED, { contactIds: ['c4a760c0-b079-4d4a-a0dc-0f97c47e6311'] }),
    ).resolves.toBe(1);
    expect(count.mock.calls[0][0].where.AND).toContainEqual({ waExists: false });
  });
});
