"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Shopify is set up in Settings → Shopify; keep this URL working for old links
export default function ShopifySettingsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings?tab=shopify");
  }, [router]);
  return null;
}
