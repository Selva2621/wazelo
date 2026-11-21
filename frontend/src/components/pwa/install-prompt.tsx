"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Share, SquarePlus, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePwaStore } from "@/stores/pwa-store";
import { useMobileStore } from "@/stores/mobile-store";

const DISMISS_KEY = "wazelo-install-dismissed";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 6000;

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch points give it away
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function snoozed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(at) && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

/**
 * Mobile only: suggests adding Wazelo to the home screen. Android/Chrome gets a
 * one-tap Install button; iOS (no install API) gets the Share → Add to Home Screen steps.
 * "Not now" hides it for 14 days.
 */
export function InstallPrompt() {
  const isMobile = useIsMobile();
  const standalone = usePwaStore((s) => s.standalone);
  const installEvent = usePwaStore((s) => s.installEvent);
  const setInstallEvent = usePwaStore((s) => s.setInstallEvent);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [ios, setIos] = useState(false);

  // Read the device and the snooze when the delay ends (browser-only values)
  useEffect(() => {
    const t = setTimeout(() => {
      setIos(isIos());
      setHidden(snoozed());
      setReady(true);
    }, SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  // Not over an open chat or editor (they hide the tab bar)
  const coveredScreen = useMobileStore((s) => s.tabBarHiders > 0);
  const canShow = isMobile && ready && !hidden && !standalone && !coveredScreen && (ios || installEvent !== null);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode: just hide for this visit */
    }
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === "dismissed") dismiss();
  };

  return (
    <AnimatePresence>
      {canShow && (
        <motion.div
          role="dialog"
          aria-label="Install Wazelo"
          // Above the tab bar (z-30), below dialogs and sheets (z-50 and up)
          className="ios-floating-card fixed inset-x-3 z-[45] lg:hidden"
          style={{ bottom: "calc(var(--mobile-tabbar-h, 0px) + env(safe-area-inset-bottom, 0px) + 12px)" }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { type: "spring", stiffness: 380, damping: 32 } }}
          exit={{ y: 40, opacity: 0, transition: { duration: 0.16 } }}
        >
          <div className="flex items-start gap-3">
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-[12px]"
            />
            <div className="min-w-0 flex-1">
              <p className="text-body-lg font-semibold text-on-surface">Install Wazelo</p>
              {ios ? (
                <p className="mt-0.5 text-body text-on-surface-variant">
                  Tap <Share className="inline h-4 w-4 -translate-y-px text-info" aria-label="Share" /> then{" "}
                  <span className="whitespace-nowrap font-medium text-on-surface">
                    Add to Home Screen <SquarePlus className="inline h-4 w-4 -translate-y-px" aria-hidden />
                  </span>
                </p>
              ) : (
                <p className="mt-0.5 text-body text-on-surface-variant">
                  Full screen, faster, with notifications.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Not now"
              className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant active:bg-surface-container-high"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {!ios && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={dismiss}
                className="h-11 rounded-xl bg-surface-container-high text-body-lg font-medium text-on-surface active:opacity-70"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={install}
                className="h-11 rounded-xl bg-primary text-body-lg font-semibold text-on-primary active:opacity-80"
              >
                Install
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
