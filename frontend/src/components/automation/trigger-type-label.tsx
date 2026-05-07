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
  HelpCircle,
} from "lucide-react";
import type { AutomationTriggerType } from "@/lib/types/automation";

const TRIGGER_CONFIG: Record<
  AutomationTriggerType,
  { label: string; icon: typeof MessageSquare }
> = {
  MESSAGE_RECEIVED:        { label: "Message Received",        icon: MessageSquare },
  CONTACT_CREATED:         { label: "Contact Created",          icon: UserPlus },
  LEAD_STATUS_CHANGED:     { label: "Status Changed",           icon: ArrowRightLeft },
  TIME_BASED:              { label: "Time-Based",               icon: Timer },
  NO_REPLY:                { label: "No Reply",                 icon: MessageCircleOff },
  LEAD_AD_RECEIVED:        { label: "Lead Ad Received",         icon: Megaphone },
  SHOPIFY_ORDER_CREATED:   { label: "Shopify Order Created",    icon: ShoppingBag },
  SHOPIFY_ORDER_FULFILLED: { label: "Shopify Order Fulfilled",  icon: ShoppingBag },
  SHOPIFY_CART_ABANDONED:  { label: "Shopify Cart Abandoned",   icon: ShoppingCart },
  WIDGET_MESSAGE_RECEIVED: { label: "Widget Message",            icon: Globe },
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
    <span className="inline-flex items-center gap-1.5 text-[12px] text-on-surface-variant">
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {config.label}
    </span>
  );
}
