import { NotFoundException } from '@nestjs/common';
import { GetScrapeRunResultsUseCase } from './get-scrape-run-results.use-case';

const ORG = 'org-1';
const RUN = 'run-2';
const RUN_AT = new Date('2026-10-15T00:00:00.000Z');
const EARLIER = new Date('2026-10-10T00:00:00.000Z');
const EARLIEST = new Date('2026-10-01T00:00:00.000Z');

function result(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    scrapeRunId: RUN,
    orgId: ORG,
    phone: null,
    sourceUrl: `https://www.google.com/maps/place/${id}?hl=en`,
    imported: false,
    contactId: null,
    createdAt: RUN_AT,
    ...over,
  };
}

function setup(opts: {
  run?: { id: string; createdAt: Date } | null;
  results?: ReturnType<typeof result>[];
  contacts?: { id: string; phoneNumber: string }[];
  prior?: { phone: string | null; sourceUrl: string; createdAt: Date }[];
} = {}) {
  const results = opts.results ?? [];
  const prisma = {
    scrapeRun: {
      findFirst: jest.fn().mockResolvedValue(opts.run === undefined ? { id: RUN, createdAt: RUN_AT } : opts.run),
    },
    scrapeResult: {
      // 1st call: this run's results; 2nd call: earlier runs' matches
      findMany: jest.fn().mockResolvedValueOnce(results).mockResolvedValueOnce(opts.prior ?? []),
      count: jest.fn().mockResolvedValue(results.length),
    },
    contact: { findMany: jest.fn().mockResolvedValue(opts.contacts ?? []) },
  };
  return { useCase: new GetScrapeRunResultsUseCase(prisma as never), prisma };
}

describe('GetScrapeRunResultsUseCase', () => {
  it('rejects a run from another org', async () => {
    const { useCase } = setup({ run: null });
    await expect(useCase.execute(ORG, RUN)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks numbers already saved as contacts, with or without the +', async () => {
    const { useCase } = setup({
      results: [
        result('a', { phone: '+919840012345' }),
        result('b', { phone: '+919962000000' }),
        result('c', { phone: '+919003000000', imported: true, contactId: 'own' }),
      ],
      contacts: [{ id: 'contact-a', phoneNumber: '919840012345' }],
    });
    const { results } = await useCase.execute(ORG, RUN);
    expect(results.map((r) => r.existingContactId)).toEqual(['contact-a', null, 'own']);
  });

  it('dates "found before" from the earliest earlier run, by phone or listing URL', async () => {
    const { useCase, prisma } = setup({
      results: [
        result('a', { phone: '+919840012345' }),
        result('b'),
        result('c'),
      ],
      prior: [
        { phone: '+919840012345', sourceUrl: 'https://x/old-a', createdAt: EARLIEST },
        { phone: '919840012345', sourceUrl: 'https://x/old-a2', createdAt: EARLIER },
        { phone: null, sourceUrl: 'https://www.google.com/maps/place/b?hl=ta', createdAt: EARLIER },
      ],
    });
    const { results } = await useCase.execute(ORG, RUN);
    expect(results.map((r) => r.seenBeforeAt)).toEqual([EARLIEST, EARLIER, null]);

    // Only runs created before this one count
    const priorWhere = prisma.scrapeResult.findMany.mock.calls[1][0].where;
    expect(priorWhere.createdAt).toEqual({ lt: RUN_AT });
    expect(priorWhere.scrapeRunId).toEqual({ not: RUN });
  });

  it('never matches on a shared search-page URL', async () => {
    const search = 'https://www.linkedin.com/jobs/search/?keywords=react';
    const { useCase, prisma } = setup({
      results: [result('a', { sourceUrl: search })],
      prior: [{ phone: null, sourceUrl: search, createdAt: EARLIER }],
    });
    const { results } = await useCase.execute(ORG, RUN);
    expect(results[0].seenBeforeAt).toBeNull();
    // Nothing to look up — no phone and no listing URL
    expect(prisma.scrapeResult.findMany).toHaveBeenCalledTimes(1);
  });
});
