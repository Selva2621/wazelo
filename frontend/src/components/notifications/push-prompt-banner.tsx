"use client";

import { BellRing, X } from "lucide-react";
import { useBrowserPush } from "@/hooks/use-browser-push";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

/**
 * Asks once per device to turn on browser notifications. Either answer is
 * stored for this device, so the banner never comes back here; the settings
 * page can still turn push on later.
 */
export function PushPromptBanner() {
  const { shouldPrompt, enable, dismiss, isPending } = useBrowserPush();
  if (!shouldPrompt) return null;

  return (
    <div className="px-4 pt-3" role="region" aria-label="Turn on notifications">
      <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-on-surface">
        <BellRing className="h-4.5 w-4.5 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0 flex-1 text-body">
          Get alerts on this device when WhatsApp disconnects, even with Wazelo closed.
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
