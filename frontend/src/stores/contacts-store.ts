"use client";

import { create } from "zustand";
import type { LeadStatus, ContactSource } from "@/lib/types/contacts";

interface ContactsState {
  selectedContactId: string | null;
  detailDrawerOpen: boolean;
  searchQuery: string;
  filterStatus: LeadStatus | null;
  filterOwnerId: string | null;
  filterSource: ContactSource | null;
  filterTagIds: string[];
  filterProductIds: string[];
  page: number;

  setSelectedContact: (id: string | null) => void;
  setDetailDrawerOpen: (open: boolean) => void;
  openContactDetail: (id: string) => void;
  closeContactDetail: () => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: LeadStatus | null) => void;
  setFilterOwnerId: (ownerId: string | null) => void;
  setFilterSource: (source: ContactSource | null) => void;
  setFilterTagIds: (tagIds: string[]) => void;
  setFilterProductIds: (productIds: string[]) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
}

export const useContactsStore = create<ContactsState>()((set) => ({
  selectedContactId: null,
  detailDrawerOpen: false,
  searchQuery: "",
  filterStatus: null,
  filterOwnerId: null,
  filterSource: null,
  filterTagIds: [],
  filterProductIds: [],
  page: 0,

  setSelectedContact: (id) => set({ selectedContactId: id }),
  setDetailDrawerOpen: (open) => set({ detailDrawerOpen: open }),
  openContactDetail: (id) =>
    set({ selectedContactId: id, detailDrawerOpen: true }),
  closeContactDetail: () =>
    set({ detailDrawerOpen: false, selectedContactId: null }),
  setSearchQuery: (query) => set({ searchQuery: query, page: 0 }),
  setFilterStatus: (status) => set({ filterStatus: status, page: 0 }),
  setFilterOwnerId: (ownerId) => set({ filterOwnerId: ownerId, page: 0 }),
  setFilterSource: (source) => set({ filterSource: source, page: 0 }),
  setFilterTagIds: (tagIds) => set({ filterTagIds: tagIds, page: 0 }),
  setFilterProductIds: (productIds) => set({ filterProductIds: productIds, page: 0 }),
  clearFilters: () =>
    set({
      filterStatus: null,
      filterOwnerId: null,
      filterSource: null,
      filterTagIds: [],
      filterProductIds: [],
      searchQuery: "",
      page: 0,
    }),
  setPage: (page) => set({ page }),
}));
