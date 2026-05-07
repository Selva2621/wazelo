"use client";

import { useState } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { ConversationItem, type Conversation } from "./conversation-item";
import { ChannelIcon } from "@/components/channels/channel-icon";
import { cn } from "@/lib/utils";
import type { ChannelType } from "@/lib/types/channels";
import { CHANNEL_TYPE_LABELS } from "@/lib/types/channels";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  channelFilter?: ChannelType | "all";
  onChannelFilterChange?: (filter: ChannelType | "all") => void;
  availableChannelTypes?: ChannelType[];
}

const filterTabs: TabItem[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mine", label: "Mine" },
];

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  channelFilter = "all",
  onChannelFilterChange,
  availableChannelTypes,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filtered = conversations.filter((c) => {
    const matchesSearch =
      !search ||
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPhone.includes(search);

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "unread" && c.unreadCount > 0);

    const matchesChannel =
      channelFilter === "all" || c.channelType === channelFilter;

    return matchesSearch && matchesTab && matchesChannel;
  });

  const showChannelFilters = availableChannelTypes && availableChannelTypes.length > 1;

  return (
    <div className="flex h-full flex-col bg-surface-container-lowest">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2 space-y-3">
        <h2 className="text-[16px] font-semibold text-on-surface">Inbox</h2>
        <SearchInput
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Channel filter pills */}
        {showChannelFilters && onChannelFilterChange && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onChannelFilterChange("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                channelFilter === "all"
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container",
              )}
            >
              All
            </button>
            {availableChannelTypes.map((type) => (
              <button
                key={type}
                onClick={() => onChannelFilterChange(type)}
                title={CHANNEL_TYPE_LABELS[type]}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors",
                  channelFilter === type
                    ? "bg-primary/15 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container",
                )}
              >
                <ChannelIcon type={type} className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        <Tabs
          tabs={filterTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[13px] text-on-surface-variant/60">
              No conversations found
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeId}
              onClick={() => onSelect(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
