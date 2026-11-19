import { OrgType } from '@prisma/client';

/** Free 14-day trial plans: one for freelancers, one for every other org type (teams). */
export const TRIAL_PLAN_SLUGS = {
  freelancer: 'free-trial-solo',
  team: 'free-trial',
} as const;

export const ALL_TRIAL_PLAN_SLUGS: readonly string[] = Object.values(TRIAL_PLAN_SLUGS);

export function trialPlanSlugFor(orgType: OrgType | string | null | undefined): string {
  return orgType === OrgType.FREELANCER ? TRIAL_PLAN_SLUGS.freelancer : TRIAL_PLAN_SLUGS.team;
}

export function isTrialPlanSlug(slug: string | null | undefined): boolean {
  return !!slug && ALL_TRIAL_PLAN_SLUGS.includes(slug);
}
