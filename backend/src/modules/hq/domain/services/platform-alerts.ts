import { OrgType } from '@prisma/client';
import { SignupStage } from './signup-lead';
import { OTP_TEMPLATE } from './whatsapp-otp';

/**
 * Wazelo → customer WhatsApp alerts, sent from Wazelo HQ's own number with HQ's
 * templates. A template is found by its exact name in HQ (Templates screen), so the
 * wording stays editable there. Params: {{1}} first name, {{2}} workspace name,
 * {{3}} the alert's detail (days left, a date…). No template, no HQ number or no
 * WhatsApp consent: the alert is skipped (the email / in-app notice still goes).
 */
export type PlatformAlertKey =
  | 'trial_ending'
  | 'trial_expired'
  | 'renewal_due'
  | 'grace_period'
  | 'payment_failed'
  | 'whatsapp_disconnected';

export const PLATFORM_ALERTS: Record<PlatformAlertKey, { template: string; label: string }> = {
  trial_ending: { template: 'wazelo_trial_ending', label: 'Trial ending (3 days and 1 day before)' },
  trial_expired: { template: 'wazelo_trial_expired', label: 'Plan / trial expired' },
  // Paid plans are not auto-charged: {{3}} e.g. "3 days (25 Nov)"
  renewal_due: { template: 'wazelo_renewal_due', label: 'Paid plan ends soon — renew (3 days and 1 day before)' },
  grace_period: { template: 'wazelo_grace_period', label: 'Grace period started' },
  payment_failed: { template: 'wazelo_payment_failed', label: 'Payment failed' },
  whatsapp_disconnected: { template: 'wazelo_whatsapp_disconnected', label: 'Their WhatsApp number disconnected' },
};

/**
 * Default wording for HQ's templates, created in HQ's Templates screen so alerts work
 * out of the box (editable there; a deleted one is not recreated). A QR number sends
 * the text as is; an official number needs the same name approved in Meta.
 */
export interface HqDefaultTemplate {
  name: string;
  category: 'UTILITY' | 'AUTHENTICATION';
  body: string;
}

const ALERT_BODIES: Record<PlatformAlertKey, string> = {
  trial_ending:
    'Hi {{1}}, your Wazelo free trial for {{2}} ends in {{3}}. Choose a plan in Billing to keep your chats, campaigns and automations running.',
  trial_expired:
    'Hi {{1}}, your Wazelo plan for {{2}} has ended. Please {{3}}. Your data is safe and waiting for you.',
  renewal_due:
    "Hi {{1}}, your Wazelo plan for {{2}} ends in {{3}}. Plans don't renew automatically, so please renew from Billing to keep sending messages.",
  grace_period:
    'Hi {{1}}, your Wazelo plan for {{2}} is paused for payment until {{3}}. Please pay from Billing to avoid any interruption.',
  payment_failed:
    "Hi {{1}}, your payment for the Wazelo plan of {{2}} didn't go through. Please try again from Billing. If money was deducted, raise a support ticket and we will check it.",
  whatsapp_disconnected:
    'Hi {{1}}, a WhatsApp number in your Wazelo workspace {{2}} got disconnected. Open Wazelo and reconnect it so your messages keep flowing.',
};

export const HQ_DEFAULT_TEMPLATES: HqDefaultTemplate[] = [
  ...(Object.keys(PLATFORM_ALERTS) as PlatformAlertKey[]).map((key) => ({
    name: PLATFORM_ALERTS[key].template,
    category: 'UTILITY' as const,
    body: ALERT_BODIES[key],
  })),
  {
    name: OTP_TEMPLATE,
    category: 'AUTHENTICATION',
    body: '{{1}} is your Wazelo verification code. It expires in 10 minutes. Do not share it with anyone.',
  },
];

/** Stored like every other template, marked so it doesn't count toward a plan limit */
export function hqTemplateRows(orgId: string, templates: HqDefaultTemplate[]) {
  return templates.map((t) => ({
    orgId,
    name: t.name,
    language: 'en',
    category: t.category,
    status: 'PENDING',
    components: [{ type: 'BODY', text: t.body }],
    exampleValues: { isSystemTemplate: true, hqDefault: true },
  }));
}

/**
 * Whether a template can be sent from HQ's number: an official (Cloud API) number
 * only sends Meta-approved templates; a QR number sends the saved text, so anything
 * not rejected works.
 */
export function sendableTemplateStatus(provider: 'QR' | 'CLOUD_API' | string) {
  return provider === 'CLOUD_API' ? { status: 'APPROVED' } : { status: { not: 'REJECTED' } };
}

/** Days before the trial ends that "trial_ending" goes out */
export const TRIAL_REMINDER_DAYS = [3, 1] as const;

/**
 * Same alert to the same workspace at most once per key — a flapping WhatsApp
 * number or a retried payment job doesn't spam the customer.
 */
export function alertIdempotencyKey(alert: PlatformAlertKey, customerOrgId: string, scope: string): string {
  return `hq-alert:${alert}:${customerOrgId}:${scope}`.slice(0, 255);
}

/** UTC day, for "once a day" alerts */
export function dayScope(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

// ─── Segment tags on HQ contacts ──────────────────────────────────────────────

/** Prefixes owned by Wazelo HQ sync; any other tag on the contact is left alone */
export const SEGMENT_TAG_PREFIXES = ['plan:', 'stage:', 'type:'] as const;

function slug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

/**
 * Tags that put a customer in HQ campaign / sequence segments:
 * plan:<plan>, stage:<signed-up|trial|paid|churned>, type:<team|freelancer>.
 */
export function segmentTags(input: { plan: string | null; stage: SignupStage; orgType: OrgType | null }): string[] {
  const tags = [`stage:${slug(input.stage)}`];
  if (input.plan) tags.push(`plan:${slug(input.plan)}`);
  if (input.orgType === OrgType.TEAM || input.orgType === OrgType.FREELANCER) tags.push(`type:${slug(input.orgType)}`);
  return tags;
}

export function isSegmentTag(name: string): boolean {
  return SEGMENT_TAG_PREFIXES.some((p) => name.startsWith(p));
}

/** Which segment tags to add and remove so the contact carries exactly `wanted`. */
export function diffSegmentTags(current: string[], wanted: string[]): { add: string[]; remove: string[] } {
  const have = new Set(current.filter(isSegmentTag));
  const want = new Set(wanted);
  return {
    add: [...want].filter((t) => !have.has(t)),
    remove: [...have].filter((t) => !want.has(t)),
  };
}
