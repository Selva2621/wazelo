import type { AutomationRule } from "@/lib/types/automation";
import type { ChatbotFlow } from "@/lib/types/chatbot";

/**
 * A chatbot that starts on the first message and an automation that replies to every
 * message both answer a new contact's first message — together they send two welcomes.
 * These spot each side so the UI can warn before both are on.
 */

/** Active automation rule that sends a message on any incoming message (no keyword) */
export function isGreetingRule(rule: AutomationRule): boolean {
  return (
    rule.status === "ACTIVE" &&
    rule.triggerType === "MESSAGE_RECEIVED" &&
    !rule.triggerConfig?.messageKeyword?.trim() &&
    rule.actions.some((a) => a.actionType === "SEND_MESSAGE")
  );
}

/** Active chatbot flow that starts on a contact's first message */
export function isGreetingFlow(flow: ChatbotFlow): boolean {
  return flow.isActive && flow.trigger.type === "FIRST_MESSAGE";
}
