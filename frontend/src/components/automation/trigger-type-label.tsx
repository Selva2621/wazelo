"use client";

import {
  MessageSquare,
  UserPlus,
  ArrowRightLeft,
  Timer,
  MessageCircleOff,
  ShoppingBag,
  ShoppingCart,
  Megaphone,
  Globe,
  Kanban,
  HelpCircle,
} from "lucide-react";
import type { AutomationTriggerType } from "@/lib/types/automation";

const TRIGGER_CONFIG: Record<
  AutomationTriggerType,
  { label: string; icon: typeof MessageSquare }
> = {
  MESSAGE_RECEIVED:        { label: "Message received",        icon: MessageSquare },
  CONTACT_CREATED:         { label: "Contact created",          icon: UserPlus },
  LEAD_STATUS_CHANGED:     { label: "Status changed",           icon: ArrowRightLeft },
  TIME_BASED:              { label: "Time-based",               icon: Timer },
  NO_REPLY:                { label: "No reply",                 icon: MessageCircleOff },
  LEAD_AD_RECEIVED:        { label: "Lead ad received",         icon: Megaphone },
  SHOPIFY_ORDER_CREATED:   { label: "Shopify order created",    icon: ShoppingBag },
  SHOPIFY_ORDER_FULFILLED: { label: "Shopify order fulfilled",  icon: ShoppingBag },
  SHOPIFY_CART_ABANDONED:  { label: "Shopify cart abandoned",   icon: ShoppingCart },
  WIDGET_MESSAGE_RECEIVED: { label: "Widget message",            icon: Globe },
  DEAL_STAGE_CHANGED:      { label: "Deal stage changed",        icon: Kanban },
};

interface TriggerTypeLabelProps {
  triggerType: AutomationTriggerType;
  showIcon?: boolean;
}

export function TriggerTypeLabel({
  triggerType,
  showIcon = true,
}: TriggerTypeLabelProps) {
  const config = TRIGGER_CONFIG[triggerType] ?? { label: triggerType, icon: HelpCircle };
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-1.5 text-label text-on-surface-variant">
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {config.label}
    </span>
  );
}
