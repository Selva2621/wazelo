"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  contactPanelOpen: boolean;
  pageTitle: string;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleContactPanel: () => void;
  setContactPanelOpen: (open: boolean) => void;
  setPageTitle: (title: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      contactPanelOpen: true,
      pageTitle: "",

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),
      toggleContactPanel: () =>
        set((s) => ({ contactPanelOpen: !s.contactPanelOpen })),
      setContactPanelOpen: (open) => set({ contactPanelOpen: open }),
      setPageTitle: (title) => set({ pageTitle: title }),
    }),
    {
      name: "crm-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        contactPanelOpen: state.contactPanelOpen,
      }),
    },
  ),
);
