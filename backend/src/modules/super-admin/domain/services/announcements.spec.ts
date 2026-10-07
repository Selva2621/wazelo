import { announcementApplies, AnnouncementLike, isLive } from './announcements';

const now = new Date('2026-10-07T12:00:00Z');
const base: AnnouncementLike = {
  targetType: 'ALL',
  targetPlanSlug: null,
  targetOrgId: null,
  startsAt: new Date('2026-10-01T00:00:00Z'),
  endsAt: null,
  archivedAt: null,
};
const ctx = { orgId: 'org-1', planSlug: 'starter-monthly', now };

describe('announcements', () => {
  it('is live between start and end, unless archived', () => {
    expect(isLive(base, now)).toBe(true);
    expect(isLive({ ...base, startsAt: new Date('2026-10-08T00:00:00Z') }, now)).toBe(false);
    expect(isLive({ ...base, endsAt: new Date('2026-10-07T11:59:59Z') }, now)).toBe(false);
    expect(isLive({ ...base, archivedAt: new Date('2026-10-02T00:00:00Z') }, now)).toBe(false);
  });

  it('targets everyone, one org, or one plan', () => {
    expect(announcementApplies(base, ctx)).toBe(true);
    expect(announcementApplies({ ...base, targetType: 'ORG', targetOrgId: 'org-1' }, ctx)).toBe(true);
    expect(announcementApplies({ ...base, targetType: 'ORG', targetOrgId: 'org-2' }, ctx)).toBe(false);
    expect(announcementApplies({ ...base, targetType: 'PLAN', targetPlanSlug: 'starter-monthly' }, ctx)).toBe(true);
    expect(announcementApplies({ ...base, targetType: 'PLAN', targetPlanSlug: 'pro-monthly' }, ctx)).toBe(false);
  });

  it('never matches a plan announcement for an org without a plan', () => {
    expect(
      announcementApplies({ ...base, targetType: 'PLAN', targetPlanSlug: 'starter-monthly' }, { ...ctx, planSlug: null }),
    ).toBe(false);
  });
});
