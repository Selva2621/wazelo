"use client";

import { create } from "zustand";
import type { ChannelType } from "@/lib/types/channels";

type InboxFilter = "all" | "unread" | "mine";
type ChannelFilter = ChannelType | "all";

interface InboxState {
  selectedConversationId: string | null;
  searchQuery: string;
  filter: InboxFilter;
  channelFilter: ChannelFilter;

  setSelectedConversation: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilter: (filter: InboxFilter) => void;
  setChannelFilter: (filter: ChannelFilter) => void;
}

export const useInboxStore = create<InboxState>()((set) => ({
  selectedConversationId: null,
  searchQuery: "",
  filter: "all",
  channelFilter: "all",

  setSelectedConversation: (id) => set({ selectedConversationId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilter: (filter) => set({ filter }),
  setChannelFilter: (filter) => set({ channelFilter: filter }),
}));
