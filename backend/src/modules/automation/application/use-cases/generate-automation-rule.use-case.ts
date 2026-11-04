import { Injectable } from '@nestjs/common';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { OrgContextService } from '@/modules/ai/domain/services/org-context.service';
import { voiceRule, type WorkspaceVoice } from '@/shared/utils/workspace-voice';

export interface GeneratedAutomationRule {
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actions: Array<{
    actionType: string;
    actionConfig: Record<string, unknown>;
    orderIndex: number;
    delaySeconds?: number;
  }>;
  cooldownSeconds?: number;
  maxExecutionsPerContact?: number;
}

export interface GenerateAutomationRuleResult {
  rule: GeneratedAutomationRule;
  explanation: string;
}

const TRIGGER_TYPES = [
  'MESSAGE_RECEIVED',
  'CONTACT_CREATED',
  'LEAD_STATUS_CHANGED',
  'TIME_BASED',
  'NO_REPLY',
  'SHOPIFY_ORDER_CREATED',
  'SHOPIFY_ORDER_FULFILLED',
  'SHOPIFY_CART_ABANDONED',
  'WIDGET_MESSAGE_RECEIVED',
  'DEAL_STAGE_CHANGED',
];

const ACTION_TYPES = ['SEND_MESSAGE', 'ASSIGN_CONTACT', 'ADD_TAG', 'UPDATE_STATUS'];

/** What kind of workspace the rule is for: who the contacts are, how messages speak, which rules fit */
function workspaceGuide(voice: WorkspaceVoice): string {
  if (voice.kind === 'FREELANCER') {
    return `Workspace: a solo freelancer${voice.service ? ` offering ${voice.service}` : ''}. Contacts are clients; deals are their projects (e.g. Enquiry → Proposal sent → Won).
- ${voiceRule(voice)}
- Good fits: DEAL_STAGE_CHANGED to chase a sent proposal or thank a new client, NO_REPLY to nudge a quiet client, CONTACT_CREATED or MESSAGE_RECEIVED to welcome a new enquiry and ask about their project.
- There is no team: don't use ASSIGN_CONTACT. Shopify triggers rarely apply.`;
  }
  return `Workspace: a business with a team. Contacts are customers (enquiries, bookings, orders).
- ${voiceRule(voice)}
- Good fits: MESSAGE_RECEIVED keyword replies, CONTACT_CREATED welcomes, ASSIGN_CONTACT to route enquiries to the team, LEAD_STATUS_CHANGED follow-ups, DEAL_STAGE_CHANGED as a booking or order moves along, Shopify triggers if they sell online.`;
}

const SYSTEM_PROMPT = `You are an automation rule generator for a WhatsApp CRM platform.

Given a plain-English description of what the user wants to automate, generate a valid automation rule as JSON.

Available trigger types:
- MESSAGE_RECEIVED: triggerConfig can have { messageKeyword?: string }
- CONTACT_CREATED: triggerConfig is {}
- LEAD_STATUS_CHANGED: triggerConfig can have { fromStatus?: string, toStatus?: string } where statuses are NEW|CONTACTED|INTERESTED|CONVERTED|CLOSED
- TIME_BASED: triggerConfig must have { cronExpression: string } (standard 5-field cron)
- NO_REPLY: triggerConfig must have { delaySeconds: number } (seconds to wait, min 60)
- SHOPIFY_ORDER_CREATED: triggerConfig can have { minOrderValue?: number }
- SHOPIFY_ORDER_FULFILLED: triggerConfig can have { minOrderValue?: number }
- SHOPIFY_CART_ABANDONED: triggerConfig can have { minCartValue?: number }
- WIDGET_MESSAGE_RECEIVED: triggerConfig can have { messageKeyword?: string }
- DEAL_STAGE_CHANGED: a deal is created in or moved to a pipeline stage. triggerConfig is {} — never invent a stageId; the user picks the stage before saving. Name the stage you mean (e.g. "Proposal sent", "Won") in the rule's description.

Available action types:
- SEND_MESSAGE: actionConfig must have { messageBody: string }. Use {{contact.name}}, {{contact.phone}}, {{shopify.order_name}}, {{shopify.total_price}}, {{shopify.recovery_url}} variables where appropriate.
- ADD_TAG: actionConfig must have { tagName: string }
- UPDATE_STATUS: actionConfig must have { newStatus: "NEW"|"CONTACTED"|"INTERESTED"|"CONVERTED"|"CLOSED" }
- ASSIGN_CONTACT: actionConfig must have { assignToUserId: string } — use "AUTO" if no specific user mentioned

Rules:
- Actions array must have at least 1 item with orderIndex starting at 0
- SEND_MESSAGE messageBody should be a natural, professional WhatsApp message, under 500 chars, written in the workspace's voice (see "Workspace" above)
- delaySeconds on actions: use 0 unless the user asks for a delay
- cooldownSeconds: set if user mentions "once per day" (86400), "once per week" (604800), else omit
- maxExecutionsPerContact: set to 1 if user says "only once per customer", else omit

Return ONLY this JSON (no extra text, no markdown):
{
  "rule": {
    "name": "string",
    "description": "string",
    "triggerType": "string",
    "triggerConfig": {},
    "actions": [{ "actionType": "string", "actionConfig": {}, "orderIndex": 0, "delaySeconds": 0 }],
    "cooldownSeconds": null,
    "maxExecutionsPerContact": null
  },
  "explanation": "one sentence explaining what this rule does"
}`;

@Injectable()
export class GenerateAutomationRuleUseCase {
  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
  ) {}

  async execute(
    orgId: string,
    prompt: string,
  ): Promise<GenerateAutomationRuleResult> {
    const [ctx, voice] = await Promise.all([this.orgContext.getContext(orgId), this.orgContext.getVoice(orgId)]);

    // The JSON format stays last, right before the request
    const rules = `${workspaceGuide(voice)}\n\n${SYSTEM_PROMPT}`;
    const systemPrompt = ctx ? `${ctx}\n\n---\n\n${rules}` : rules;

    const result = await this.aiProvider.complete({
      systemPrompt,
      // Website/document details matching the request, e.g. so a reply message quotes real prices
      userPrompt: [await this.orgContext.getRelevantKnowledge(orgId, prompt), `Generate an automation rule for: "${prompt}"`]
        .filter(Boolean)
        .join('\n\n'),
      maxTokens: 800,
    });

    try {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as GenerateAutomationRuleResult;

        // Validate trigger type
        if (!TRIGGER_TYPES.includes(parsed.rule?.triggerType)) {
          parsed.rule.triggerType = 'MESSAGE_RECEIVED';
        }
        if (!parsed.rule.triggerConfig || typeof parsed.rule.triggerConfig !== 'object') {
          parsed.rule.triggerConfig = {};
        }
        // The AI can't know stage ids: the draft means "any stage" until the user picks one
        if (parsed.rule.triggerType === 'DEAL_STAGE_CHANGED') {
          delete parsed.rule.triggerConfig.stageId;
        }

        // Validate action types
        if (Array.isArray(parsed.rule?.actions)) {
          parsed.rule.actions = parsed.rule.actions.filter((a) =>
            ACTION_TYPES.includes(a.actionType),
          );
        }

        // Ensure at least one action
        if (!parsed.rule?.actions?.length) {
          parsed.rule.actions = [
            { actionType: 'SEND_MESSAGE', actionConfig: { messageBody: 'Hello {{contact.name}}!' }, orderIndex: 0, delaySeconds: 0 },
          ];
        }

        // Strip null cooldown/maxExec
        if (parsed.rule.cooldownSeconds === null) delete (parsed.rule as any).cooldownSeconds;
        if (parsed.rule.maxExecutionsPerContact === null) delete (parsed.rule as any).maxExecutionsPerContact;

        return {
          rule: parsed.rule,
          explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
        };
      }
    } catch {
      // fallback below
    }

    // Minimal fallback
    return {
      rule: {
        name: 'Auto-generated rule',
        description: prompt,
        triggerType: 'MESSAGE_RECEIVED',
        triggerConfig: {},
        actions: [
          { actionType: 'SEND_MESSAGE', actionConfig: { messageBody: 'Hello {{contact.name}}!' }, orderIndex: 0, delaySeconds: 0 },
        ],
      },
      explanation: 'Could not fully parse the AI response — a default rule was created. Please review and adjust.',
    };
  }
}
