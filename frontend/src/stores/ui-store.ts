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
      sidebarCollapsed: false,
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
      // v2: sidebar defaults to expanded. Reset the previous default once while
      // preserving the user's ability to collapse it again afterward.
      version: 2,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<UIState>;
        return {
          sidebarCollapsed:
            version < 2 ? false : (state.sidebarCollapsed ?? false),
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
