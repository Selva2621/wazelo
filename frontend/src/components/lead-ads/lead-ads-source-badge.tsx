"use client";

import { Facebook, Instagram, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LeadAdPlatform } from "@/lib/types/lead-ads";

interface LeadAdSourceBadgeProps {
  platform: LeadAdPlatform | string;
  className?: string;
}

const platformConfig: Record<string, { icon: typeof Facebook; label: string }> = {
  facebook: { icon: Facebook, label: "FB Ad" },
  instagram: { icon: Instagram, label: "IG Ad" },
  whatsapp: { icon: MessageCircle, label: "WA Ad" },
  FACEBOOK_LEAD_AD: { icon: Facebook, label: "FB Ad" },
  INSTAGRAM_LEAD_AD: { icon: Instagram, label: "IG Ad" },
  WHATSAPP_LEAD_AD: { icon: MessageCircle, label: "WA Ad" },
};

export function LeadAdSourceBadge({ platform, className }: LeadAdSourceBadgeProps) {
  const config = platformConfig[platform];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge variant="info" className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
