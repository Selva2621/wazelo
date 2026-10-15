import { archivedPlanEditBlocker, planDeletionBlocker, PLAN_HAS_HISTORY_MESSAGE } from './plan-lifecycle';

describe('planDeletionBlocker', () => {
  it('allows deleting a plan nobody ever subscribed to', () => {
    expect(planDeletionBlocker(0)).toBeNull();
  });

  it('refuses a plan with any subscription history', () => {
    expect(planDeletionBlocker(1)).toBe(PLAN_HAS_HISTORY_MESSAGE);
  });
});

describe('archivedPlanEditBlocker', () => {
  const archived = { archivedAt: new Date() };

  it('refuses activating an archived plan', () => {
    expect(archivedPlanEditBlocker(archived, { isActive: true })).toMatch(/Unarchive/);
  });

  it('allows other edits of an archived plan', () => {
    expect(archivedPlanEditBlocker(archived, { isActive: false })).toBeNull();
    expect(archivedPlanEditBlocker(archived, {})).toBeNull();
  });

  it('allows activating a plan that is not archived', () => {
    expect(archivedPlanEditBlocker({ archivedAt: null }, { isActive: true })).toBeNull();
  });
});
