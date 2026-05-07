"use client";

import { X, Clock, Shield, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChannelIcon } from "./channel-icon";
import { ChannelStatusBadge } from "./channel-status-badge";
import { CHANNEL_TYPE_LABELS } from "@/lib/types/channels";
import type { Channel, ChannelCapabilities } from "@/lib/types/channels";

interface ChannelDetailPanelProps {
  channel: Channel;
  onClose: () => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChannelDetailPanel({ channel, onClose }: ChannelDetailPanelProps) {
  const caps = channel.capabilities as ChannelCapabilities | null;

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <ChannelIcon type={channel.type} className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-on-surface">{channel.name}</h3>
            <p className="text-sm text-on-surface-variant">
              {CHANNEL_TYPE_LABELS[channel.type]}
              {channel.externalHandle && ` · ${channel.externalHandle}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChannelStatusBadge status={channel.status} />
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Dates */}
        <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Created" value={formatDate(channel.createdAt)} />
        <InfoRow icon={<Shield className="h-3.5 w-3.5" />} label="Verified" value={formatDate(channel.verifiedAt)} />
        <InfoRow icon={<Zap className="h-3.5 w-3.5" />} label="Last Active" value={formatDate(channel.lastActiveAt)} />
        <InfoRow label="Rate Limit" value={`${channel.rateLimitPerMin} msgs/min (burst: ${channel.rateLimitBurst})`} />
      </div>

      {/* Error */}
      {channel.lastError && (
        <div className="mt-4 rounded-xl bg-error-container/30 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-error" />
            <span className="text-xs font-medium text-error">Last Error</span>
          </div>
          <p className="text-xs text-on-surface-variant">{channel.lastError}</p>
          <p className="text-xs text-on-surface-variant/60 mt-1">
            {formatDate(channel.lastErrorAt)}
          </p>
        </div>
      )}

      {/* Suspend reason */}
      {channel.status === "SUSPENDED" && channel.suspendReason && (
        <div className="mt-4 rounded-xl bg-warning-container/30 p-3">
          <p className="text-xs font-medium text-warning mb-1">Suspend Reason</p>
          <p className="text-xs text-on-surface-variant">{channel.suspendReason}</p>
          <p className="text-xs text-on-surface-variant/60 mt-1">
            Since {formatDate(channel.suspendedAt)}
          </p>
        </div>
      )}

      {/* Capabilities */}
      {caps && (
        <div className="mt-4">
          <p className="text-sm font-medium text-on-surface mb-2">Capabilities</p>
          <div className="flex flex-wrap gap-1.5">
            {caps.supportedMessageTypes?.map((t) => (
              <Badge key={t} variant="default">{t}</Badge>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-on-surface-variant">
            <span>Max text: {caps.maxTextLength?.toLocaleString()} chars</span>
            <span>Max media: {caps.maxMediaSizeMb} MB</span>
            <span>Reactions: {caps.supportsReactions ? "Yes" : "No"}</span>
            <span>Read receipts: {caps.supportsReadReceipts ? "Yes" : "No"}</span>
            <span>Media: {caps.supportsMedia ? "Yes" : "No"}</span>
            <span>Opt-in required: {caps.requiresContactOptIn ? "Yes" : "No"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-on-surface-variant/60">{icon}</span>}
      <span className="text-on-surface-variant">{label}:</span>
      <span className="text-on-surface font-medium">{value}</span>
    </div>
  );
}
