"use client";

import { create } from "zustand";
import type { CampaignStatus } from "@/lib/types/campaigns";

interface CampaignsState {
  selectedCampaignId: string | null;
  searchQuery: string;
  filterStatus: CampaignStatus | null;
  page: number;

  setSelectedCampaign: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: CampaignStatus | null) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
}

export const useCampaignsStore = create<CampaignsState>()((set) => ({
  selectedCampaignId: null,
  searchQuery: "",
  filterStatus: null,
  page: 0,

  setSelectedCampaign: (id) => set({ selectedCampaignId: id }),
  setSearchQuery: (query) => set({ searchQuery: query, page: 0 }),
  setFilterStatus: (status) => set({ filterStatus: status, page: 0 }),
  clearFilters: () =>
    set({
      filterStatus: null,
      searchQuery: "",
      page: 0,
    }),
  setPage: (page) => set({ page }),
}));
