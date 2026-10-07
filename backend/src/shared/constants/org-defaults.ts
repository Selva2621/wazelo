/**
 * Default master data seeded into every new organization by the
 * org onboarding job (see modules/org/application/use-cases/onboard-org.use-case.ts).
 *
 * Each collection is only seeded when the org has none of that kind yet,
 * so admins can freely edit or delete these after signup.
 */

export interface DefaultPipelineStage {
  name: string;
  order: number;
  color: string;
  isWonStage?: boolean;
  isLostStage?: boolean;
}

export const DEFAULT_PIPELINE_STAGES: DefaultPipelineStage[] = [
  { name: 'Qualified', order: 0, color: '#6366f1' },
  { name: 'Proposal', order: 1, color: '#f59e0b' },
  { name: 'Negotiation', order: 2, color: '#3b82f6' },
  { name: 'Won', order: 3, color: '#22c55e', isWonStage: true },
  { name: 'Lost', order: 4, color: '#ef4444', isLostStage: true },
];

export const DEFAULT_PIPELINE = {
  name: 'Sales Pipeline',
  description: 'Default pipeline created at signup',
  stages: DEFAULT_PIPELINE_STAGES,
};

export const DEFAULT_TAGS: { name: string; color: string }[] = [
  { name: 'Hot Lead', color: '#ef4444' },
  { name: 'Warm Lead', color: '#f59e0b' },
  { name: 'Cold Lead', color: '#3b82f6' },
  { name: 'Customer', color: '#22c55e' },
  { name: 'VIP', color: '#a855f7' },
  { name: 'Follow Up', color: '#6366f1' },
];

export const DEFAULT_CANNED_RESPONSES: {
  title: string;
  shortcut: string;
  category: string;
  content: string;
}[] = [
  {
    title: 'Greeting',
    shortcut: '/hi',
    category: 'General',
    content: 'Hi! Thanks for reaching out. How can we help you today?',
  },
  {
    title: 'Thank You',
    shortcut: '/thanks',
    category: 'General',
    content: 'Thank you for contacting us! Let us know if there is anything else we can help with.',
  },
  {
    title: 'Away / After Hours',
    shortcut: '/away',
    category: 'General',
    content: "Thanks for your message! Our team is currently away. We'll get back to you as soon as we're back online.",
  },
  {
    title: 'Follow Up',
    shortcut: '/followup',
    category: 'Sales',
    content: 'Hi, just following up on our earlier conversation. Do you have any questions we can help with?',
  },
  {
    title: 'Request Details',
    shortcut: '/details',
    category: 'Support',
    content: 'Could you please share a few more details so we can help you better?',
  },
];

/** Signals emitted by events/handlers/lead-scoring-events.handler.ts */
export const DEFAULT_LEAD_SCORING_RULES: {
  name: string;
  description: string;
  signal: string;
  condition?: Record<string, unknown>;
  points: number;
  maxPerContact: number;
}[] = [
  {
    name: 'Customer replied',
    description: 'Inbound message from the contact',
    signal: 'message_received',
    points: 5,
    maxPerContact: 10,
  },
  {
    name: 'Came from a lead ad',
    description: 'Contact created from a Facebook lead ad',
    signal: 'contact_created',
    condition: { source: 'FACEBOOK_LEAD_AD' },
    points: 10,
    maxPerContact: 1,
  },
  {
    name: 'Marked as interested',
    description: 'Lead status moved to INTERESTED',
    signal: 'status_changed',
    condition: { toStatus: 'INTERESTED' },
    points: 20,
    maxPerContact: 1,
  },
  {
    name: 'Tagged as hot lead',
    description: 'Contact tagged "Hot Lead"',
    signal: 'tag_added',
    condition: { tagName: 'Hot Lead' },
    points: 15,
    maxPerContact: 1,
  },
  {
    name: 'Note added',
    description: 'An agent added a note to the contact',
    signal: 'note_added',
    points: 2,
    maxPerContact: 5,
  },
];

/**
 * Seeded inactive so new orgs don't get breach alerts before they
 * configure business hours and who gets notified.
 */
export const DEFAULT_SLA_POLICIES: {
  name: string;
  description: string;
  metricType: 'FIRST_RESPONSE_TIME' | 'AVG_RESPONSE_TIME' | 'RESOLUTION_TIME';
  thresholdMs: number;
  warningThresholdMs: number;
}[] = [
  {
    name: 'Standard First Response',
    description: 'Reply to new conversations within 1 hour',
    metricType: 'FIRST_RESPONSE_TIME',
    thresholdMs: 60 * 60 * 1000,
    warningThresholdMs: 45 * 60 * 1000,
  },
  {
    name: 'Standard Resolution',
    description: 'Resolve conversations within 24 hours',
    metricType: 'RESOLUTION_TIME',
    thresholdMs: 24 * 60 * 60 * 1000,
    warningThresholdMs: 20 * 60 * 60 * 1000,
  },
];
