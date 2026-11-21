import { ContactSource } from '@prisma/client';
import { WHATSAPP_CONSENT_TYPE, WhatsAppPermissionService } from './whatsapp-permission.service';

function setup(opts: { inbound?: boolean; consent?: boolean; inboundIds?: string[]; contact?: Record<string, unknown> | null } = {}) {
  const prisma = {
    message: { findFirst: jest.fn(async () => (opts.inbound ? { id: 'm1' } : null)) },
    consentRecord: { findFirst: jest.fn(async () => (opts.consent ? { id: 'cr1' } : null)) },
    contact: {
      findFirst: jest.fn(async () => (opts.contact === undefined ? null : opts.contact)),
      findMany: jest.fn(async () => [{ id: 'c1' }]),
    },
    $queryRaw: jest.fn(async () => (opts.inboundIds ?? []).map((id) => ({ id }))),
  };
  return { service: new WhatsAppPermissionService(prisma as never), prisma };
}

const lead = { id: 'c1', source: ContactSource.WEB_SCRAPE, phoneNumber: '+919000000001' };
const activeConsent = { consentType: WHATSAPP_CONSENT_TYPE, granted: true, revokedAt: null };

describe('WhatsAppPermissionService', () => {
  it('permits every source except the lead finder without any lookup', async () => {
    const { service, prisma } = setup();
    for (const source of [ContactSource.WHATSAPP, ContactSource.MANUAL, ContactSource.IMPORT, ContactSource.FACEBOOK_LEAD_AD]) {
      await expect(service.getStatus('o1', { ...lead, source })).resolves.toBe('not_required');
    }
    expect(prisma.message.findFirst).not.toHaveBeenCalled();
    expect(prisma.consentRecord.findFirst).not.toHaveBeenCalled();
  });

  it('a lead finder contact that wrote first is permitted (phone with and without +)', async () => {
    const { service, prisma } = setup({ inbound: true });
    await expect(service.getStatus('o1', lead)).resolves.toBe('messaged_first');
    expect(prisma.message.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: 'o1',
          direction: 'INBOUND',
          deletedAt: null,
          contactPhone: { in: ['919000000001', '+919000000001'] },
        }),
      }),
    );
  });

  it('a lead finder contact with an active WhatsApp consent record is permitted', async () => {
    const { service, prisma } = setup({ consent: true });
    await expect(service.getStatus('o1', lead)).resolves.toBe('agreed');
    expect(prisma.consentRecord.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: 'o1', contactId: 'c1', ...activeConsent } }),
    );
    await expect(service.isPermitted('o1', lead)).resolves.toBe(true);
  });

  it('a lead finder contact with neither is not permitted', async () => {
    const { service } = setup();
    await expect(service.getStatus('o1', lead)).resolves.toBe('not_yet');
    await expect(service.isPermitted('o1', lead)).resolves.toBe(false);
  });

  it('hasPermission loads the contact within the org; a missing contact is not permitted', async () => {
    const missing = setup({ contact: null });
    await expect(missing.service.hasPermission('o1', 'c1')).resolves.toBe(false);
    expect(missing.prisma.contact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', orgId: 'o1', deletedAt: null } }),
    );

    const found = setup({ contact: lead, consent: true });
    await expect(found.service.hasPermission('o1', 'c1')).resolves.toBe(true);
  });

  it('builds one audience clause: other sources, active consent, or lead finder contacts that wrote first', async () => {
    const { service, prisma } = setup({ inboundIds: ['c7', 'c8'] });
    await expect(service.permittedWhere('o1')).resolves.toEqual({
      OR: [
        { source: { not: ContactSource.WEB_SCRAPE } },
        { consentRecords: { some: { orgId: 'o1', ...activeConsent } } },
        { id: { in: ['c7', 'c8'] } },
      ],
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('leaves out the inbound branch when no lead finder contact wrote first', async () => {
    const { service } = setup();
    const where = await service.permittedWhere('o1');
    expect(where.OR).toHaveLength(2);
  });

  it('builds the opposite clause for counting the left-out contacts', async () => {
    const { service } = setup({ inboundIds: ['c7'] });
    await expect(service.notPermittedWhere('o1')).resolves.toEqual({
      source: ContactSource.WEB_SCRAPE,
      consentRecords: { none: { orgId: 'o1', ...activeConsent } },
      id: { notIn: ['c7'] },
    });
    const none = setup();
    await expect(none.service.notPermittedWhere('o1')).resolves.not.toHaveProperty('id');
  });

  it('picks the org lead finder contacts without an active agreement in one query', async () => {
    const { service, prisma } = setup();
    await expect(service.idsNeedingConsent('o1', ['c1', 'c2'])).resolves.toEqual(['c1']);
    expect(prisma.contact.findMany).toHaveBeenCalledWith({
      where: {
        orgId: 'o1',
        id: { in: ['c1', 'c2'] },
        deletedAt: null,
        source: ContactSource.WEB_SCRAPE,
        consentRecords: { none: { orgId: 'o1', ...activeConsent } },
      },
      select: { id: true },
    });
    prisma.contact.findMany.mockClear();
    await expect(service.idsNeedingConsent('o1', [])).resolves.toEqual([]);
    expect(prisma.contact.findMany).not.toHaveBeenCalled();
  });

  it('batch-checks a list of contacts in one query', async () => {
    const { service, prisma } = setup();
    await expect(service.filterPermitted('o1', ['c1', 'c2'])).resolves.toEqual(new Set(['c1']));
    expect(prisma.contact.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ orgId: 'o1', id: { in: ['c1', 'c2'] } }, expect.objectContaining({ OR: expect.any(Array) })] },
      }),
    );
    await expect(service.filterPermitted('o1', [])).resolves.toEqual(new Set());
  });
});
