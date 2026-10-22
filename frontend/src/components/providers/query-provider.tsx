"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { AI_CREDITS_USED_EVENT } from "@/lib/api/client";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  // An AI call spent credits: refresh balances (header pill, AI Credits page, billing usage)
  useEffect(() => {
    const refresh = () => {
      client.invalidateQueries({ queryKey: ["ai-credits"] });
      client.invalidateQueries({ queryKey: ["billing", "subscription"] });
    };
    window.addEventListener(AI_CREDITS_USED_EVENT, refresh);
    return () => window.removeEventListener(AI_CREDITS_USED_EVENT, refresh);
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
