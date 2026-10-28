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
  /** Shows placeholder rows instead of the "No conversations" message on first load. */
  isLoading?: boolean;
}

function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3">
      <div className="h-10 w-10 shrink-0 rounded-full bg-surface-container animate-pulse" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="h-3 w-1/2 rounded-full bg-surface-container animate-pulse" />
          <div className="h-2.5 w-8 rounded-full bg-surface-container animate-pulse" />
        </div>
        <div className="h-2.5 w-4/5 rounded-full bg-surface-container animate-pulse" />
      </div>
    </div>
  );
}

const channelChip =
  "inline-flex h-8 items-center rounded-full border px-3 text-label font-medium transition-colors duration-180 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface";
const channelChipActive = "border-transparent bg-on-surface text-surface";
const channelChipIdle =
  "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:text-on-surface";

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
  isLoading = false,
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
    <div className="flex h-full flex-col bg-surface-container-lowest max-lg:bg-surface">
      {/* No "Inbox" heading: the header bar (desktop) and nav bar (mobile) already say it */}
      <div className="shrink-0 px-4 pt-4 pb-2 space-y-3 max-lg:pt-1">
        <SearchInput
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Channel filter pills */}
        {showChannelFilters && onChannelFilterChange && (
          <div className="flex items-center gap-1.5">
            {/* Icon-only chips styled like the shared Tabs pills (Tabs takes text labels only) */}
            <button
              type="button"
              onClick={() => onChannelFilterChange("all")}
              aria-pressed={channelFilter === "all"}
              className={cn(channelChip, channelFilter === "all" ? channelChipActive : channelChipIdle)}
            >
              All
            </button>
            {availableChannelTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onChannelFilterChange(type)}
                title={CHANNEL_TYPE_LABELS[type]}
                aria-label={CHANNEL_TYPE_LABELS[type]}
                aria-pressed={channelFilter === type}
                className={cn(channelChip, channelFilter === type ? channelChipActive : channelChipIdle)}
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
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 max-lg:px-0 max-lg:space-y-0">
        {isLoading ? (
          <div aria-busy="true" aria-label="Loading conversations">
            {Array.from({ length: 7 }, (_, i) => (
              <ConversationRowSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-body text-on-surface-variant/60">
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
