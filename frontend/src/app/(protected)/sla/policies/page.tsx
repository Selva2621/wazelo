"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// SLA policies are managed in Settings → SLA Policies; keep this URL working for old links
export default function SlaPoliciesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings?tab=sla");
  }, [router]);
  return null;
}
