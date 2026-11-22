import { BillingCycle, OrgType, PlanType } from '@prisma/client';

/** Wazelo HQ: the platform's own workspace, where Wazelo works its own leads and website chats. */
export const HQ_ORG_NAME = 'Wazelo HQ';

/** Hidden plan behind HQ's permanent subscription. Never on sale (inactive + archived). */
export const INTERNAL_PLAN_SLUG = 'wazelo-internal';

/** HQ's subscription period never ends, so renewal and expiry jobs never pick it up. */
export const HQ_PERIOD_END = new Date('2099-12-31T23:59:59.000Z');

export const HQ_ORG_TYPE = OrgType.TEAM;

/**
 * Every feature on, every limit 0 (= unlimited in UsageTrackingService and the AI wallet).
 * Fields match Prisma's Plan create input.
 */
export function internalPlanData(now = new Date()) {
  return {
    name: 'Wazelo Internal',
    slug: INTERNAL_PLAN_SLUG,
    description: "Wazelo HQ only — the platform's own workspace. Not for sale.",
    planType: PlanType.CRM,
    billingCycle: BillingCycle.YEARLY,
    priceInCents: 0,
    currency: 'INR',
    isActive: false,
    isDefault: false,
    archivedAt: now,
    trialDays: 0,
    maxUsers: 0,
    maxWhatsappSessions: 0,
    maxMessagesPerMonth: 0,
    maxCampaignsPerMonth: 0,
    campaignsEnabled: true,
    automationEnabled: true,
    apiEnabled: true,
    maxApiCallsPerMonth: 0,
    aiEnabled: true,
    aiCreditsPerMonth: 0,
    maxMessageTemplates: 0,
    shopifyEnabled: true,
    maxShopifyStores: 0,
  };
}

/**
 * HQ's website chat, on from the start: wazelo.in embeds it, visitors fill the
 * name / mobile / email form first, and chats land in HQ's inbox.
 */
export const HQ_WIDGET = {
  enabled: true,
  companyName: 'Wazelo',
  primaryColor: '#d97707',
  welcomeMessage: 'Hi! Questions about Wazelo? Ask us here.',
  preChatFormEnabled: true,
};

/**
 * Email for a super admin's HQ user. User emails are unique across all orgs, so when the
 * super admin's own address is already a tenant login, the HQ user gets `name+hq@domain`.
 */
export function hqUserEmail(superAdminEmail: string, emailTaken: boolean): string {
  const email = superAdminEmail.trim().toLowerCase();
  if (!emailTaken) return email;
  const at = email.lastIndexOf('@');
  if (at <= 0) return `${email}+hq`;
  return `${email.slice(0, at)}+hq${email.slice(at)}`;
}

/** "Selva Kumar B" → { firstName: "Selva", lastName: "Kumar B" }; one word → lastName "". */
export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Wazelo', lastName: 'Admin' };
  return { firstName: parts[0].slice(0, 100), lastName: parts.slice(1).join(' ').slice(0, 100) };
}
