import {
  batchCountFor,
  planBatchSessions,
  readBatchPlanMetadata,
  selectBatchesToDispatch,
} from './batch-plan';

describe('batch-plan', () => {
  describe('planBatchSessions', () => {
    it('deals 1000 recipients (10 batches) over 3 numbers as 4/3/3', () => {
      const plan = planBatchSessions(batchCountFor(1000, 100), ['A', 'B', 'C']);
      expect([...plan.entries()]).toEqual([
        [1, 'A'], [2, 'B'], [3, 'C'], [4, 'A'], [5, 'B'],
        [6, 'C'], [7, 'A'], [8, 'B'], [9, 'C'], [10, 'A'],
      ]);
      const perNumber = [...plan.values()].reduce<Record<string, number>>((acc, s) => {
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {});
      expect(perNumber).toEqual({ A: 4, B: 3, C: 3 });
    });

    it('covers batches beyond the overrides (audience grew after scheduling)', () => {
      const plan = planBatchSessions(4, ['A', 'B'], [
        { batchNumber: 1, sessionId: 'B' },
        { batchNumber: 2, sessionId: 'B' },
      ]);
      expect(plan.get(1)).toBe('B');
      expect(plan.get(2)).toBe('B');
      expect(plan.get(3)).toBe('A');
      expect(plan.get(4)).toBe('B');
    });

    it('ignores overrides pointing at a number that is no longer usable', () => {
      const plan = planBatchSessions(2, ['A'], [{ batchNumber: 1, sessionId: 'GONE' }]);
      expect(plan.get(1)).toBe('A');
    });

    it('returns an empty plan with no numbers or no recipients', () => {
      expect(planBatchSessions(3, []).size).toBe(0);
      expect(planBatchSessions(0, ['A']).size).toBe(0);
      expect(batchCountFor(0, 100)).toBe(0);
      expect(batchCountFor(101, 100)).toBe(2);
    });
  });

  describe('readBatchPlanMetadata', () => {
    it('reads the stored pool and overrides', () => {
      expect(readBatchPlanMetadata(
        { sessionPool: ['A', 'B'], batchSessionAssignments: [{ batchNumber: 1, sessionId: 'B' }] },
        'A',
      )).toEqual({ pool: ['A', 'B'], overrides: [{ batchNumber: 1, sessionId: 'B' }] });
    });

    it('derives the pool from old per-batch assignments', () => {
      expect(readBatchPlanMetadata(
        { batchSessionAssignments: [{ batchNumber: 1, sessionId: 'A' }, { batchNumber: 2, sessionId: 'C' }, { bad: true }] },
        null,
      ).pool).toEqual(['A', 'C']);
    });

    it('falls back to the campaign number for legacy campaigns', () => {
      expect(readBatchPlanMetadata(null, 'A')).toEqual({ pool: ['A'], overrides: [] });
      expect(readBatchPlanMetadata([], null)).toEqual({ pool: [], overrides: [] });
    });
  });

  describe('selectBatchesToDispatch', () => {
    const summary = (batchNumber: number, sessionId: string | null, pending: number, queued = 0) =>
      ({ batchNumber, sessionId, pending, queued });

    it('starts only the first batch on each number', () => {
      const batches = [
        summary(1, 'A', 100), summary(2, 'B', 100), summary(3, 'C', 100),
        summary(4, 'A', 100), summary(5, 'B', 100), summary(6, 'C', 100),
      ];
      expect(selectBatchesToDispatch(batches, { sequentialPerSession: true })).toEqual([1, 2, 3]);
    });

    it("moves to a number's next batch only after its current batch is done", () => {
      const batches = [
        // batch 1 finished (not in summary), batch 4 next on A
        summary(4, 'A', 100),
        summary(2, 'B', 40, 1), // in flight → B waits
        summary(5, 'B', 100),
      ];
      expect(selectBatchesToDispatch(batches, { sequentialPerSession: true })).toEqual([4]);
    });

    it('does not restart a batch that is only waiting on a held message', () => {
      expect(selectBatchesToDispatch([summary(1, 'A', 0, 1), summary(2, 'A', 100)], { sequentialPerSession: true }))
        .toEqual([]);
    });

    it('runs every email batch in parallel', () => {
      expect(selectBatchesToDispatch(
        [summary(1, null, 100), summary(2, null, 100), summary(3, null, 0, 1)],
        { sequentialPerSession: false },
      )).toEqual([1, 2]);
    });

    it('returns nothing when the campaign has no unfinished work', () => {
      expect(selectBatchesToDispatch([], { sequentialPerSession: true })).toEqual([]);
    });
  });
});
