import { OrgAiMemoryService } from './org-ai-memory.service';

const ARTICLES = [{ title: 'Delivery', body: 'We deliver in Chennai' }];

function setup({ existing = null as Record<string, unknown> | null, changedArticles = 0 } = {}) {
  const prisma = {
    organization: { findUnique: jest.fn(async () => ({ id: 'o1', name: 'Selva Studio', industry: null, description: null, website: null })) },
    product: { findMany: jest.fn(async () => []) },
    kbArticle: { findMany: jest.fn(async () => ARTICLES), count: jest.fn(async () => changedArticles) },
    integrationConfig: { findFirst: jest.fn(async () => null) },
    orgAiMemory: { findUnique: jest.fn(async () => existing), upsert: jest.fn(async () => ({})) },
  };
  const aiProvider = { complete: jest.fn(async () => ({ text: 'Fresh summary' })) };
  const aiCredits = { canAfford: jest.fn(async () => true), charge: jest.fn(async () => undefined) };
  const events = { emit: jest.fn() };
  const service = new OrgAiMemoryService(prisma as never, aiProvider as never, aiCredits as never, events as never);
  const saved = () => (prisma.orgAiMemory.upsert.mock.calls[0] as unknown as [{ update: { kbSummary: string | null } }])[0].update.kbSummary;
  return { service, prisma, aiProvider, aiCredits, saved, events };
}

describe('OrgAiMemoryService.rebuild', () => {
  it('never summarises team-only articles (the summary reaches customer bots)', async () => {
    const { service, prisma } = setup();
    await service.rebuild('o1');
    expect(prisma.kbArticle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ orgId: 'o1', isInternal: false, isPublished: true }) }),
    );
  });

  it('reuses the summary (no AI call, no credits) when no article changed', async () => {
    const { service, aiProvider, aiCredits, saved } = setup({
      existing: { kbSummary: 'Old summary', builtAt: new Date('2026-11-01T00:00:00Z') },
      changedArticles: 0,
    });
    await service.rebuild('o1');
    expect(aiProvider.complete).not.toHaveBeenCalled();
    expect(aiCredits.charge).not.toHaveBeenCalled();
    expect(saved()).toBe('Old summary');
  });

  it('writes a new summary when an article changed since the last build', async () => {
    const { service, aiProvider, saved } = setup({
      existing: { kbSummary: 'Old summary', builtAt: new Date('2026-11-01T00:00:00Z') },
      changedArticles: 1,
    });
    await service.rebuild('o1');
    expect(aiProvider.complete).toHaveBeenCalled();
    expect(saved()).toBe('Fresh summary');
  });

  it('tells the AI to drop its cached context after a rebuild', async () => {
    const { service, events } = setup();
    await service.rebuild('o1');
    expect(events.emit).toHaveBeenCalledWith('ai_memory.updated', { orgId: 'o1' });
  });

  it('rebuilds summaries made before team-only articles were filtered out', async () => {
    const { service, aiProvider } = setup({
      existing: { kbSummary: 'Might include internal notes', builtAt: new Date('2026-10-01T00:00:00Z') },
      changedArticles: 0,
    });
    await service.rebuild('o1');
    expect(aiProvider.complete).toHaveBeenCalled();
  });
});
