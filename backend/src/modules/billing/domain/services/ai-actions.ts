/**
 * Every AI feature that spends credits. The super admin can change each cost
 * (PlatformSettings ai.actionCosts); a cost of 0 makes the action free.
 */
export const AI_ACTIONS = {
  smart_reply: { label: 'Smart reply suggestions', defaultCost: 1 },
  read_chat: { label: 'Read a chat (mood, wants, tags)', defaultCost: 1 },
  summarize: { label: 'Conversation summary', defaultCost: 1 },
  sentiment: { label: 'Sentiment analysis', defaultCost: 1 },
  categorize: { label: 'Auto-categorize', defaultCost: 1 },
  intent: { label: 'Intent detection', defaultCost: 1 },
  routing: { label: 'Routing suggestion', defaultCost: 1 },
  kb_search: { label: 'Knowledge base answer', defaultCost: 1 },
  insights: { label: 'Analytics insights', defaultCost: 1 },
  full_analysis: { label: 'Full conversation analysis', defaultCost: 5 },
  chatbot_reply: { label: 'Chatbot AI reply', defaultCost: 1 },
  widget_reply: { label: 'Website widget AI reply', defaultCost: 1 },
  purchase_intent: { label: 'Purchase intent detection', defaultCost: 1 },
  deal_score: { label: 'Deal scoring', defaultCost: 1 },
  deal_scope: { label: 'Deal scope draft', defaultCost: 1 },
  proposal_draft: { label: 'Proposal draft', defaultCost: 2 },
  proposal_improve: { label: 'Proposal section rewrite', defaultCost: 1 },
  campaign_copy: { label: 'Campaign copy', defaultCost: 1 },
  automation_rule: { label: 'Automation rule from prompt', defaultCost: 1 },
  template_generate: { label: 'Message template draft', defaultCost: 1 },
  sequence_generate: { label: 'Sequence draft from prompt', defaultCost: 2 },
  sequence_rewrite: { label: 'Sequence message rewrite', defaultCost: 1 },
  kb_tags: { label: 'Article tag suggestions', defaultCost: 1 },
  org_memory: { label: 'Business memory rebuild', defaultCost: 0 },
  kb_build: { label: 'Learn from website', defaultCost: 10 },
  faq_generate: { label: 'FAQ suggestions', defaultCost: 3 },
} as const satisfies Record<string, { label: string; defaultCost: number }>;

export type AiAction = keyof typeof AI_ACTIONS;

export const MAX_ACTION_COST = 100;

export function isAiAction(value: string): value is AiAction {
  return Object.prototype.hasOwnProperty.call(AI_ACTIONS, value);
}

/** The super admin's cost for the action, else its default. */
export function costOf(action: AiAction, overrides: Record<string, number>): number {
  const cost = overrides[action];
  return Number.isInteger(cost) && cost >= 0 ? cost : AI_ACTIONS[action].defaultCost;
}
