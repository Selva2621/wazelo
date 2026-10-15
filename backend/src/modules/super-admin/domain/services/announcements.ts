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

/** The editable fields of an announcement. */
export interface AnnouncementContent {
  title: string;
  body: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  targetType: 'ALL' | 'PLAN' | 'ORG';
  targetPlanSlug: string | null;
  targetOrgId: string | null;
  startsAt: Date;
  endsAt: Date | null;
  dismissible: boolean;
}

/** A partial edit; `endsAt: null` clears the end time (runs until archived). */
export interface AnnouncementPatch {
  title?: string;
  body?: string;
  severity?: AnnouncementContent['severity'];
  targetType?: AnnouncementContent['targetType'];
  targetPlanSlug?: string;
  targetOrgId?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  dismissible?: boolean;
}

export type AnnouncementPatchResult = { ok: true; next: AnnouncementContent } | { ok: false; error: string };

/**
 * Applies a partial edit to an announcement with the same rules as creation: a PLAN target
 * needs a plan slug, an ORG target an org id (kept from the current target when the type is
 * unchanged), the unused target field is cleared, and the end must be after the start. Pure logic.
 */
export function applyAnnouncementPatch(current: AnnouncementContent, patch: AnnouncementPatch): AnnouncementPatchResult {
  const targetType = patch.targetType ?? current.targetType;
  const keep = targetType === current.targetType;

  const targetPlanSlug =
    targetType === 'PLAN' ? (patch.targetPlanSlug ?? (keep ? current.targetPlanSlug : null)) : null;
  const targetOrgId = targetType === 'ORG' ? (patch.targetOrgId ?? (keep ? current.targetOrgId : null)) : null;
  if (targetType === 'PLAN' && !targetPlanSlug) return { ok: false, error: 'Choose a plan to target' };
  if (targetType === 'ORG' && !targetOrgId) return { ok: false, error: 'Choose an organization to target' };

  const startsAt = patch.startsAt ? new Date(patch.startsAt) : current.startsAt;
  const endsAt = patch.endsAt === undefined ? current.endsAt : patch.endsAt === null ? null : new Date(patch.endsAt);
  if (endsAt && endsAt <= startsAt) return { ok: false, error: 'End time must be after the start time' };

  return {
    ok: true,
    next: {
      title: patch.title ?? current.title,
      body: patch.body ?? current.body,
      severity: patch.severity ?? current.severity,
      targetType,
      targetPlanSlug,
      targetOrgId,
      startsAt,
      endsAt,
      dismissible: patch.dismissible ?? current.dismissible,
    },
  };
}
