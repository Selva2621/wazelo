import { Injectable } from '@nestjs/common';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { OrgContextService } from '@/modules/ai/domain/services/org-context.service';

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
];

const ACTION_TYPES = ['SEND_MESSAGE', 'ASSIGN_CONTACT', 'ADD_TAG', 'UPDATE_STATUS'];

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

Available action types:
- SEND_MESSAGE: actionConfig must have { messageBody: string }. Use {{contact.name}}, {{contact.phone}}, {{shopify.order_name}}, {{shopify.total_price}}, {{shopify.recovery_url}} variables where appropriate.
- ADD_TAG: actionConfig must have { tagName: string }
- UPDATE_STATUS: actionConfig must have { newStatus: "NEW"|"CONTACTED"|"INTERESTED"|"CONVERTED"|"CLOSED" }
- ASSIGN_CONTACT: actionConfig must have { assignToUserId: string } — use "AUTO" if no specific user mentioned

Rules:
- Actions array must have at least 1 item with orderIndex starting at 0
- SEND_MESSAGE messageBody should be a natural WhatsApp message, under 500 chars
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
    const ctx = await this.orgContext.getContext(orgId);

    const systemPrompt = ctx
      ? `${ctx}\n\n---\n\n${SYSTEM_PROMPT}`
      : SYSTEM_PROMPT;

    const result = await this.aiProvider.complete({
      systemPrompt,
      userPrompt: `Generate an automation rule for: "${prompt}"`,
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
