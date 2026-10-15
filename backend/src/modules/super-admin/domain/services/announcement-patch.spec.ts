import { AnnouncementContent, applyAnnouncementPatch } from './announcements';

const current: AnnouncementContent = {
  title: 'Maintenance',
  body: 'Tonight',
  severity: 'INFO',
  targetType: 'PLAN',
  targetPlanSlug: 'pro',
  targetOrgId: null,
  startsAt: new Date('2026-10-10T00:00:00Z'),
  endsAt: new Date('2026-10-12T00:00:00Z'),
  dismissible: true,
};

function next(patch: Parameters<typeof applyAnnouncementPatch>[1]) {
  const r = applyAnnouncementPatch(current, patch);
  if (!r.ok) throw new Error(r.error);
  return r.next;
}

describe('applyAnnouncementPatch', () => {
  it('keeps every field the patch leaves out', () => {
    expect(next({ title: 'New' })).toEqual({ ...current, title: 'New' });
  });

  it('keeps the current plan slug when the target type is unchanged', () => {
    expect(next({ targetType: 'PLAN' }).targetPlanSlug).toBe('pro');
  });

  it('requires an org id when switching to an org target', () => {
    expect(applyAnnouncementPatch(current, { targetType: 'ORG' })).toEqual({
      ok: false,
      error: 'Choose an organization to target',
    });
    const n = next({ targetType: 'ORG', targetOrgId: 'org-1' });
    expect(n).toMatchObject({ targetOrgId: 'org-1', targetPlanSlug: null });
  });

  it('clears both target fields for ALL', () => {
    expect(next({ targetType: 'ALL', targetPlanSlug: 'ignored' })).toMatchObject({
      targetPlanSlug: null,
      targetOrgId: null,
    });
  });

  it('rejects an end before the (possibly unchanged) start', () => {
    expect(applyAnnouncementPatch(current, { endsAt: '2026-10-09T00:00:00Z' })).toMatchObject({ ok: false });
    expect(applyAnnouncementPatch(current, { startsAt: '2026-10-13T00:00:00Z' })).toMatchObject({ ok: false });
  });

  it('clears the end time with null', () => {
    expect(next({ endsAt: null }).endsAt).toBeNull();
  });
});
