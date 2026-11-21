"use client";

import { useSyncExternalStore } from "react";
import type { Currency } from "./plans";

// India sees rupees, everyone else dollars. Detected from the browser time zone (no
// geo-IP service needed), overridable by the visitor and remembered in localStorage.
// The server render has no currency (null) so prices can stay hidden until it's known,
// which avoids a flash of the wrong price.

const KEY = "wz-currency";
const INDIA_TZ = new Set(["Asia/Kolkata", "Asia/Calcutta"]);
const listeners = new Set<() => void>();
let current: Currency | null = null;

function detect(): Currency {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "INR" || saved === "USD") return saved;
  } catch {
    /* storage blocked: fall back to time zone */
  }
  try {
    return INDIA_TZ.has(Intl.DateTimeFormat().resolvedOptions().timeZone) ? "INR" : "USD";
  } catch {
    return "USD";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setCurrency(c: Currency) {
  current = c;
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* not persisted; still applies for this visit */
  }
  listeners.forEach((l) => l());
}

/** null during the server render and hydration, then the visitor's currency. */
export function useCurrency(): Currency | null {
  return useSyncExternalStore(
    subscribe,
    () => (current ??= detect()),
    () => null,
  );
}
