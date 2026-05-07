"use client";

import { Pencil, Pause, Play, Trash2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ChannelIcon } from "./channel-icon";
import { ChannelStatusBadge } from "./channel-status-badge";
import { CHANNEL_TYPE_LABELS } from "@/lib/types/channels";
import type { Channel } from "@/lib/types/channels";

interface ChannelListProps {
  channels: Channel[];
  onEdit: (channel: Channel) => void;
  onSuspend: (channel: Channel) => void;
  onReactivate: (channel: Channel) => void;
  onDelete: (channel: Channel) => void;
  canManage?: boolean;
  canDelete?: boolean;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ChannelList({
  channels,
  onEdit,
  onSuspend,
  onReactivate,
  onDelete,
  canManage,
  canDelete,
}: ChannelListProps) {
  if (channels.length === 0) {
    return (
      <EmptyState
        icon={<Radio className="h-16 w-16" />}
        title="No channels configured"
        description="Add a channel to start sending and receiving messages across platforms."
      />
    );
  }

  return (
    <div className="space-y-3">
      {channels.map((channel) => (
        <div
          key={channel.id}
          className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 transition-colors hover:bg-surface-container-low/50"
        >
          <div className="flex items-start justify-between gap-3">
            {/* Left: Icon + Info */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                <ChannelIcon type={channel.type} className="h-5 w-5 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-on-surface truncate">
                    {channel.name}
                  </h4>
                  <ChannelStatusBadge status={channel.status} />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                  <span>{CHANNEL_TYPE_LABELS[channel.type]}</span>
                  {channel.externalHandle && (
                    <span className="font-mono">{channel.externalHandle}</span>
                  )}
                  <span>Rate: {channel.rateLimitPerMin}/min</span>
                  <span>Active: {formatTimeAgo(channel.lastActiveAt)}</span>
                </div>

                {channel.lastError && (
                  <p className="text-xs text-error mt-1.5 line-clamp-1">
                    Error: {channel.lastError}
                  </p>
                )}

                {channel.suspendReason && channel.status === "SUSPENDED" && (
                  <p className="text-xs text-warning mt-1.5 line-clamp-1">
                    Suspended: {channel.suspendReason}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(channel)}
                title="Edit channel"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>

              {canManage && channel.status === "ACTIVE" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSuspend(channel)}
                  title="Suspend channel"
                >
                  <Pause className="h-3.5 w-3.5" />
                </Button>
              )}

              {canManage && channel.status === "SUSPENDED" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReactivate(channel)}
                  title="Reactivate channel"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}

              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(channel)}
                  title="Delete channel"
                  className="text-error hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
