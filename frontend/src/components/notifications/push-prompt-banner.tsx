"use client";

import { BellRing, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useBrowserPush } from "@/hooks/use-browser-push";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

/**
 * Asks once per device to turn on browser notifications. Either answer is
 * stored for this device, so the banner never comes back here; the settings
 * page can still turn push on later.
 */
// On phones the banner only shows where it fits the context; desktop shows it everywhere
const MOBILE_BANNER_PATHS = new Set(["/dashboard", "/dashboard/freelancer", "/notifications"]);
// Desktop: the floating card would sit over a message box (send button) on these screens
const covers = (path: string) => path.endsWith("/inbox") || path.startsWith("/inbox") || path.startsWith("/ai-assistant");

export function PushPromptBanner() {
  const { shouldPrompt, enable, dismiss, isPending } = useBrowserPush();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  if (!shouldPrompt) return null;
  const path = pathname.replace(/\/+$/, "") || "/";
  if (isMobile && !MOBILE_BANNER_PATHS.has(path)) return null;
  if (!isMobile && covers(path)) return null;

  return (
    // Desktop: floats bottom-right so it never pushes full-height pages (inbox, campaigns)
    // below the fold and adds a second scrollbar. Phones: inline strip on the pages above.
    <div
      className="px-4 pt-3 max-lg:pt-1 max-lg:pb-2 lg:fixed lg:bottom-4 lg:right-4 lg:z-40 lg:w-[min(32rem,calc(100vw-2rem))] lg:p-0"
      role="region"
      aria-label="Turn on notifications"
    >
      <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container px-4 py-3 lg:shadow-lg text-on-surface max-lg:gap-2.5 max-lg:border-0 max-lg:bg-surface-container-lowest max-lg:py-2.5 max-lg:pl-3 max-lg:pr-1.5">
        <BellRing className="h-4.5 w-4.5 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0 flex-1 text-body">
          <span className="max-lg:hidden">Get alerts on this device when WhatsApp disconnects, even with Wazelo closed.</span>
          <span className="text-native-subhead leading-5 lg:hidden">Get alerts if WhatsApp disconnects</span>
        </p>
        <Button size="sm" onClick={enable} loading={isPending}>
          Enable
        </Button>
        <IconButton size="sm" aria-label="Not now" onClick={dismiss} disabled={isPending}>
          <X className="h-4 w-4" aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}
