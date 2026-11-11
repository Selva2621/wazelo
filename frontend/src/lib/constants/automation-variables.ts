import type { AutomationTriggerType } from "@/lib/types/automation";

export interface VarChip {
  label: string;
  value: string;
}

export const CONTACT_VAR_CHIPS: VarChip[] = [
  { label: "Name",  value: "{{contact.name}}" },
  { label: "Phone", value: "{{contact.phone}}" },
];

const SHOPIFY_VAR_CHIPS: VarChip[] = [
  { label: "Order #",      value: "{{shopify.order_name}}" },
  { label: "Total",        value: "{{shopify.total_price}}" },
  { label: "Currency",     value: "{{shopify.currency}}" },
  { label: "Items",        value: "{{shopify.items}}" },
  { label: "Recovery URL", value: "{{shopify.recovery_url}}" },
  { label: "Cart Total",   value: "{{shopify.cart_total}}" },
];

/** Form answers are {{lead.<question>}} too — "What's your city?" → {{lead.what_s_your_city}} */
const LEAD_VAR_CHIPS: VarChip[] = [
  { label: "Campaign", value: "{{lead.campaign}}" },
  { label: "Ad",       value: "{{lead.ad}}" },
  { label: "Platform", value: "{{lead.platform}}" },
];

/** The variables a trigger adds on top of the contact's own fields */
export function triggerVarChips(triggerType: AutomationTriggerType): VarChip[] {
  if (triggerType.startsWith("SHOPIFY_")) return SHOPIFY_VAR_CHIPS;
  if (triggerType === "LEAD_AD_RECEIVED") return LEAD_VAR_CHIPS;
  return [];
}
