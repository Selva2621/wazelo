"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// API keys are managed in Settings → API Keys & Docs; keep this URL working for old links
export default function ApiKeysRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings?tab=developer-api&section=keys");
  }, [router]);
  return null;
}
