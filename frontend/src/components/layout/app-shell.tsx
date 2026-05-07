"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useUIStore } from "@/stores/ui-store";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  fullHeight?: boolean;
}

export function AppShell({ children, fullHeight }: AppShellProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <Header />
      <main
        className={cn(
          "transition-[margin-left] duration-200 ease-in-out",
          collapsed
            ? "ml-[var(--sidebar-collapsed)]"
            : "ml-[var(--sidebar-width)]",
          fullHeight && "h-[calc(100vh-var(--header-height))]",
        )}
      >
        {children}
      </main>
    </div>
  );
}
