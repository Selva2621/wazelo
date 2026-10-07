import { extendedTrialEnd } from './org-management.use-cases';

const DAY = 24 * 60 * 60 * 1000;

describe('extendedTrialEnd', () => {
  const now = new Date('2026-10-07T12:00:00Z');

  it('extends from the current trial end when it is in the future', () => {
    const end = new Date(now.getTime() + 3 * DAY);
    expect(extendedTrialEnd(end, 7, now).getTime()).toBe(end.getTime() + 7 * DAY);
  });

  it('extends from now when the trial end has already passed', () => {
    const end = new Date(now.getTime() - 2 * DAY);
    expect(extendedTrialEnd(end, 7, now).getTime()).toBe(now.getTime() + 7 * DAY);
  });

  it('extends from now when there is no trial end', () => {
    expect(extendedTrialEnd(null, 14, now).getTime()).toBe(now.getTime() + 14 * DAY);
  });
});
