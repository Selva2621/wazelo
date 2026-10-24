"use client";

import { AnimatePresence, motion } from "motion/react";
import { WifiOff } from "lucide-react";
import { usePwaStore } from "@/stores/pwa-store";

/** Mobile only: a slim pill under the status bar while there is no connection. */
export function OfflineBanner() {
  const online = usePwaStore((s) => s.online);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center lg:hidden"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 6px)" }}
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        >
          <span className="flex items-center gap-1.5 rounded-full bg-on-surface px-3 py-1.5 text-label font-medium text-surface shadow-lg">
            <WifiOff className="h-3.5 w-3.5" aria-hidden />
            No internet connection
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
