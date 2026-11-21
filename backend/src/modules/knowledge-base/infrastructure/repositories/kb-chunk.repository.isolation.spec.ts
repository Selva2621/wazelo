import { KbChunkRepository } from './kb-chunk.repository';

/**
 * Knowledge must never cross workspaces or reach customers when it's private.
 * These pin the search query's filters, so a refactor can't silently drop one.
 */
describe('KbChunkRepository.search — what a search may return', () => {
  function capture() {
    const calls: { sql: string; values: unknown[] }[] = [];
    const prisma = {
      $queryRaw: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
        calls.push({ sql: strings.join('?'), values });
        return Promise.resolve([]);
      }),
    };
    return { repo: new KbChunkRepository(prisma as never), calls };
  }

  it("only searches the asking workspace's passages", async () => {
    const { repo, calls } = capture();
    await repo.search('org-A', 'website price');
    expect(calls[0].sql).toMatch(/WHERE c\.org_id = \?::uuid/);
    expect(calls[0].values).toContain('org-A');
    expect(calls[0].values).not.toContain('org-B');
  });

  it('skips deleted or unfinished documents, unpublished and team-only articles', async () => {
    const { repo, calls } = capture();
    await repo.search('org-A', 'delivery charges');
    const sql = calls[0].sql;
    expect(sql).toContain('d.deleted_at IS NULL');
    expect(sql).toContain("d.status = 'READY'");
    expect(sql).toContain('a.deleted_at IS NULL');
    expect(sql).toContain('a.is_published = true');
    expect(sql).toContain('a.is_internal = false');
  });

  it('runs no query for a question with no searchable words', async () => {
    const { repo, calls } = capture();
    expect(await repo.search('org-A', 'is the a')).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
