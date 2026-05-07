"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

export function usePageTitle(title: string) {
  const setPageTitle = useUIStore((s) => s.setPageTitle);

  useEffect(() => {
    setPageTitle(title);
  }, [title, setPageTitle]);
}
