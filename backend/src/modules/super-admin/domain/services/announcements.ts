export interface AnnouncementLike {
  targetType: 'ALL' | 'PLAN' | 'ORG';
  targetPlanSlug: string | null;
  targetOrgId: string | null;
  startsAt: Date;
  endsAt: Date | null;
  archivedAt: Date | null;
}

export interface AudienceContext {
  orgId: string;
  /** Slug of the org's current plan, if it has a live subscription */
  planSlug: string | null;
  now?: Date;
}

/** Whether an announcement is live right now. */
export function isLive(a: Pick<AnnouncementLike, 'startsAt' | 'endsAt' | 'archivedAt'>, now = new Date()): boolean {
  return !a.archivedAt && a.startsAt <= now && (!a.endsAt || a.endsAt > now);
}

/** Whether a live announcement is shown to this org. */
export function announcementApplies(a: AnnouncementLike, ctx: AudienceContext): boolean {
  if (!isLive(a, ctx.now ?? new Date())) return false;
  switch (a.targetType) {
    case 'ALL':
      return true;
    case 'ORG':
      return a.targetOrgId === ctx.orgId;
    case 'PLAN':
      return !!ctx.planSlug && a.targetPlanSlug === ctx.planSlug;
  }
}
