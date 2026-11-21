import { CampaignAudienceType } from '@prisma/client';
import { AudienceResolverService } from './audience-resolver.service';

// Stand-in clauses for the lead finder WhatsApp permission rule
const PERMITTED = { OR: [{ source: { not: 'WEB_SCRAPE' } }, { id: { in: ['ok-lead'] } }] };
const NOT_PERMITTED = { source: 'WEB_SCRAPE', id: { notIn: ['ok-lead'] } };
const permission = () => ({
  permittedWhere: jest.fn(async () => PERMITTED),
  notPermittedWhere: jest.fn(async () => NOT_PERMITTED),
});

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
    } as never, permission() as never);

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
    } as never, permission() as never);

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
    } as never, permission() as never);

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
            // ...and lead finder contacts without WhatsApp permission
            PERMITTED,
          ],
          leadStatus: { in: ['NEW'] },
        }),
      }),
    );
  });

  it('keeps unchecked numbers but drops ones known not to be on WhatsApp (preview too)', async () => {
    const count = jest.fn().mockResolvedValue(3);
    const resolver = new AudienceResolverService({ contact: { count } } as never, permission() as never);

    await resolver.previewAudienceCount('org-1', CampaignAudienceType.ALL, undefined, 'WHATSAPP');
    expect(count.mock.calls[0][0].where.AND).toContainEqual({ OR: [{ waExists: null }, { waExists: true }] });

    // Email campaigns don't care whether a number is on WhatsApp
    await resolver.previewAudienceCount('org-1', CampaignAudienceType.ALL, undefined, 'EMAIL');
    expect(JSON.stringify(count.mock.calls[1][0].where)).not.toContain('waExists');
  });

  it('counts audience members a check found are not on WhatsApp (for the preview note)', async () => {
    const count = jest.fn().mockResolvedValue(1);
    const resolver = new AudienceResolverService({ contact: { count } } as never, permission() as never);

    await expect(
      resolver.countNotOnWhatsApp('org-1', CampaignAudienceType.FILTERED, { contactIds: ['c4a760c0-b079-4d4a-a0dc-0f97c47e6311'] }),
    ).resolves.toBe(1);
    expect(count.mock.calls[0][0].where.AND).toContainEqual({ waExists: false });
  });

  it('leaves lead finder contacts without WhatsApp permission out of WhatsApp audiences, not email ones', async () => {
    const contactFindMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const perm = permission();
    const resolver = new AudienceResolverService({ contact: { findMany: contactFindMany, count } } as never, perm as never);

    await resolver.resolveAudience('org-1', CampaignAudienceType.ALL);
    expect(perm.permittedWhere).toHaveBeenCalledWith('org-1');
    expect(contactFindMany.mock.calls[0][0].where.AND).toContainEqual(PERMITTED);

    await resolver.previewAudienceCount('org-1', CampaignAudienceType.ALL, undefined, 'WHATSAPP');
    expect(count.mock.calls[0][0].where.AND).toContainEqual(PERMITTED);

    // Email campaigns don't need WhatsApp permission
    await resolver.resolveEmailAudience('org-1', CampaignAudienceType.ALL);
    await resolver.previewAudienceCount('org-1', CampaignAudienceType.ALL, undefined, 'EMAIL');
    expect(JSON.stringify(contactFindMany.mock.calls[1][0].where)).not.toContain('WEB_SCRAPE');
    expect(JSON.stringify(count.mock.calls[1][0].where)).not.toContain('WEB_SCRAPE');
    expect(perm.permittedWhere).toHaveBeenCalledTimes(2);
  });

  it('counts WhatsApp audience members left out for missing WhatsApp permission (for the preview note)', async () => {
    const count = jest.fn().mockResolvedValue(4);
    const perm = permission();
    const resolver = new AudienceResolverService({ contact: { count } } as never, perm as never);

    await expect(resolver.countWithoutWhatsAppPermission('org-1', CampaignAudienceType.ALL)).resolves.toBe(4);
    const { where } = count.mock.calls[0][0];
    expect(where).toMatchObject({ orgId: 'org-1', deletedAt: null, optedOut: false });
    // Only those otherwise reachable: not double-counted with "not on WhatsApp"
    expect(where.AND).toEqual([{ OR: [{ waExists: null }, { waExists: true }] }, NOT_PERMITTED]);
  });

  it('counts a lead finder run before outreach: total reachable and how many have WhatsApp permission', async () => {
    const count = jest.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(3);
    const scrapeResultFindMany = jest.fn().mockResolvedValue([{ contactId: 'a' }, { contactId: 'b' }]);
    const perm = permission();
    const resolver = new AudienceResolverService(
      { contact: { count }, scrapeResult: { findMany: scrapeResultFindMany } } as never,
      perm as never,
    );

    await expect(
      resolver.countWhatsAppPermission('org-1', CampaignAudienceType.FILTERED, { scrapeRunId: 'run-1', leadStatuses: ['NEW'] }),
    ).resolves.toEqual({ total: 12, withPermission: 3 });

    // One batch permission clause, not a check per contact
    expect(perm.permittedWhere).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledTimes(2);
    const [totalWhere, permittedWhere] = count.mock.calls.map((c) => c[0].where);
    for (const where of [totalWhere, permittedWhere]) {
      expect(where).toMatchObject({ orgId: 'org-1', deletedAt: null, optedOut: false, id: { in: ['a', 'b'] }, leadStatus: { in: ['NEW'] } });
    }
    expect(totalWhere.AND).toEqual([{ OR: [{ waExists: null }, { waExists: true }] }]);
    expect(permittedWhere.AND).toEqual([{ OR: [{ waExists: null }, { waExists: true }] }, PERMITTED]);
  });
});
