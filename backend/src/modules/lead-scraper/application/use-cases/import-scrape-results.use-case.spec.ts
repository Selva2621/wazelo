import { ImportScrapeResultsUseCase } from './import-scrape-results.use-case';

const results = [
  { id: 'r1', phone: '+919000000001', name: 'A', waExists: null, waCheckedAt: null },
  { id: 'r2', phone: '+919000000002', name: 'B', waExists: null, waCheckedAt: null },
  // No phone: never becomes a contact
  { id: 'r3', phone: null, name: 'C', waExists: null, waCheckedAt: null },
];

function setup() {
  const prisma = {
    scrapeRun: {
      findFirst: jest.fn(async () => ({ id: 'run1', source: 'GOOGLE_MAPS', filters: { country: 'IN' } })),
      update: jest.fn(async () => ({})),
    },
    scrapeResult: {
      findMany: jest.fn(async () => results),
      update: jest.fn(async () => ({})),
      count: jest.fn(async () => 2),
    },
    contact: { update: jest.fn(async () => ({})) },
  };
  const contactRepository = {
    // r1 creates a new contact, r2 links an existing one
    upsertByPhone: jest.fn(async (data: { phoneNumber: string }) =>
      data.phoneNumber.endsWith('1')
        ? { contact: { id: 'c1' }, created: true }
        : { contact: { id: 'c2' }, created: false },
    ),
  };
  const eventEmitter = { emit: jest.fn() };
  const orgLocale = { get: jest.fn(async () => ({ country: 'IN' })) };
  const permission = { recordForContacts: jest.fn(async () => ({ recorded: 1, skipped: 1 })) };
  const useCase = new ImportScrapeResultsUseCase(
    prisma as never,
    contactRepository as never,
    eventEmitter as never,
    orgLocale as never,
    permission as never,
  );
  return { useCase, permission, prisma };
}

describe('ImportScrapeResultsUseCase', () => {
  it('imports without recording WhatsApp permission when not asked', async () => {
    const { useCase, permission } = setup();
    await expect(useCase.execute('o1', 'u1', 'run1')).resolves.toEqual({
      imported: 1,
      skipped: 1,
      noPhone: 1,
      failed: 0,
      permissionRecorded: 0,
    });
    expect(permission.recordForContacts).not.toHaveBeenCalled();
  });

  it('records permission once for every contact the import created or linked', async () => {
    const { useCase, permission } = setup();
    const outcome = await useCase.execute('o1', 'u1', 'run1', ['r1', 'r2', 'r3'], { how: 'call', note: 'Agreed' });

    expect(permission.recordForContacts).toHaveBeenCalledTimes(1);
    const [orgId, userId, contactIds, dto, opts] = permission.recordForContacts.mock.calls[0] as unknown as [
      string,
      string,
      string[],
      unknown,
      unknown,
    ];
    expect(orgId).toBe('o1');
    expect(userId).toBe('u1');
    expect([...contactIds].sort()).toEqual(['c1', 'c2']);
    expect(dto).toEqual({ how: 'call', note: 'Agreed' });
    expect(opts).toEqual({ via: 'lead_finder_import', scrapeRunId: 'run1' });
    expect(outcome.permissionRecorded).toBe(1);
  });

  it('scopes the run and results lookup to the org', async () => {
    const { useCase, prisma } = setup();
    await useCase.execute('o1', 'u1', 'run1', ['r1']);
    expect(prisma.scrapeRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'run1', orgId: 'o1' } }));
    expect(prisma.scrapeResult.findMany).toHaveBeenCalledWith({
      where: { orgId: 'o1', scrapeRunId: 'run1', imported: false, id: { in: ['r1'] } },
    });
  });
});
