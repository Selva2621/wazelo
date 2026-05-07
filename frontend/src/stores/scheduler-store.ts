"use client";

import { create } from "zustand";
import type { ScheduledMessageStatus } from "@/lib/types/scheduler";

interface SchedulerState {
  selectedMessageId: string | null;
  searchQuery: string;
  filterStatus: ScheduledMessageStatus | null;
  page: number;
  showCreateModal: boolean;

  setSelectedMessage: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: ScheduledMessageStatus | null) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setShowCreateModal: (open: boolean) => void;
}

export const useSchedulerStore = create<SchedulerState>()((set) => ({
  selectedMessageId: null,
  searchQuery: "",
  filterStatus: null,
  page: 0,
  showCreateModal: false,

  setSelectedMessage: (id) => set({ selectedMessageId: id }),
  setSearchQuery: (query) => set({ searchQuery: query, page: 0 }),
  setFilterStatus: (status) => set({ filterStatus: status, page: 0 }),
  clearFilters: () =>
    set({
      filterStatus: null,
      searchQuery: "",
      page: 0,
    }),
  setPage: (page) => set({ page }),
  setShowCreateModal: (open) => set({ showCreateModal: open }),
}));
