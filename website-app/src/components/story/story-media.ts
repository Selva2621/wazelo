"use client";

import { useCurrency } from "@/components/pricing/use-currency";

// Meera's story (a home buyer at Northwind Residences) is recorded twice, like the pricing:
// India sees the ₹ version (Powai, Mumbai), everyone else the $ version (Dubai Marina). The $ files have no suffix; the ₹ ones end
// in "-inr". Until the currency is known (server render) the $ version is used.

/** "-inr" for visitors in India, "" otherwise; null until the currency is known (server render). */
export function useMediaSuffix(): string | null {
  const c = useCurrency();
  return c === null ? null : c === "INR" ? "-inr" : "";
}

/** The deal value shown in the hero, matching the recordings. */
export function useStoryPrice() {
  return useCurrency() === "INR" ? "₹2.4 Cr" : "$650,000";
}

/**
 * Paths for an app recording in public/media/story (desktop, or the phone-size cut). Empty
 * until the currency is known, so India never downloads the $ clip first (or the reverse).
 */
export function useStoryClip() {
  const sfx = useMediaSuffix();
  return (id: string, mobile = false) => {
    if (sfx === null) return { src: undefined, poster: undefined };
    const base = `/media/story/${id}${mobile ? "-m" : ""}${sfx}`;
    return { src: `${base}.mp4`, poster: `${base}.jpg` };
  };
}
