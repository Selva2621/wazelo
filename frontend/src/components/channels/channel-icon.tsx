"use client";

import { MessageCircle, Instagram, Facebook, Mail } from "lucide-react";
import type { ChannelType } from "@/lib/types/channels";

interface ChannelIconProps {
  type: ChannelType;
  className?: string;
  size?: number;
}

const iconMap = {
  WHATSAPP: MessageCircle,
  INSTAGRAM: Instagram,
  FACEBOOK_MESSENGER: Facebook,
  EMAIL: Mail,
} as const;

export function ChannelIcon({ type, className = "h-4 w-4", size }: ChannelIconProps) {
  const Icon = iconMap[type] || MessageCircle;
  return <Icon className={className} size={size} />;
}
