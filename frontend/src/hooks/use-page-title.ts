"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

export function usePageTitle(title: string) {
  const setPageTitle = useUIStore((s) => s.setPageTitle);

  useEffect(() => {
    setPageTitle(title);
    // Clear on leave, so a page without a title never shows the previous page's
    return () => setPageTitle("");
  }, [title, setPageTitle]);
}
