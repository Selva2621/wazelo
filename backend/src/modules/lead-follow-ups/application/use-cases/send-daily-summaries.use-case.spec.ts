import { EVENT_NAMES } from '@/common/constants';
import { SendDailySummariesUseCase } from './lead-follow-up.use-cases';

const brand = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  orgId: 'o1',
  name: 'Kavya Homes',
  managerId: 'm1',
  lastSummaryDate: null as string | null,
  organization: { timezone: 'Asia/Kolkata' },
  ...over,
});

const lead = {
  contactName: 'Lakshmi',
  contactPhone: '+91 1',
  productName: 'Villa plots',
  assigneeName: 'Ravi',
  dueAt: new Date('2026-11-10T06:30:00Z'),
  touchedAt: null,
};

function setup(brands = [brand()], leads: unknown[] = [lead]) {
  const repo = {
    findBrandsWithManagers: jest.fn(async () => brands),
    leadsForBrand: jest.fn(async () => leads),
    markSummarySent: jest.fn(async () => ({})),
  };
  const events = { emit: jest.fn() };
  return { repo, events, useCase: new SendDailySummariesUseCase(repo as any, events as any) };
}

// 14:00 UTC = 19:30 IST; 10:00 UTC = 15:30 IST
const evening = new Date('2026-11-10T14:00:00Z');
const afternoon = new Date('2026-11-10T10:00:00Z');

describe('SendDailySummariesUseCase', () => {
  it("sends the manager the brand's summary after 7 PM their time, once", async () => {
    const { repo, events, useCase } = setup();
    expect(await useCase.execute(evening)).toBe(1);
    expect(repo.leadsForBrand).toHaveBeenCalledWith('o1', 'b1', new Date('2026-11-09T18:30:00.000Z'), evening);
    expect(repo.markSummarySent).toHaveBeenCalledWith('b1', '2026-11-10');
    expect(events.emit).toHaveBeenCalledWith(
      EVENT_NAMES.LEAD_DAILY_SUMMARY,
      expect.objectContaining({ managerId: 'm1', title: 'Kavya Homes: 1 lead today' }),
    );
  });

  it('waits until 7 PM, and skips a brand already summarised today', async () => {
    const early = setup();
    expect(await early.useCase.execute(afternoon)).toBe(0);
    expect(early.repo.leadsForBrand).not.toHaveBeenCalled();

    const done = setup([brand({ lastSummaryDate: '2026-11-10' })]);
    expect(await done.useCase.execute(evening)).toBe(0);
  });

  it('sends nothing on a day without leads, but still marks the day done', async () => {
    const { repo, events, useCase } = setup([brand()], []);
    expect(await useCase.execute(evening)).toBe(0);
    expect(repo.markSummarySent).toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});
