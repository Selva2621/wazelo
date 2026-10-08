"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  /** Off-canvas sidebar below the lg breakpoint. Not persisted. */
  mobileSidebarOpen: boolean;
  contactPanelOpen: boolean;
  pageTitle: string;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleContactPanel: () => void;
  setContactPanelOpen: (open: boolean) => void;
  setPageTitle: (title: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: true,
      mobileSidebarOpen: false,
      contactPanelOpen: true,
      pageTitle: "",

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      toggleContactPanel: () =>
        set((s) => ({ contactPanelOpen: !s.contactPanelOpen })),
      setContactPanelOpen: (open) => set({ contactPanelOpen: open }),
      setPageTitle: (title) => set({ pageTitle: title }),
    }),
    {
      name: "crm-ui",
      // v1: sidebar defaults to collapsed. Reset the value saved under the old default once;
      // the user's own toggle is persisted again from here on.
      version: 1,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<UIState>;
        return {
          sidebarCollapsed: version < 1 ? true : (state.sidebarCollapsed ?? true),
          contactPanelOpen: state.contactPanelOpen ?? true,
        };
      },
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        contactPanelOpen: state.contactPanelOpen,
      }),
    },
  ),
);
