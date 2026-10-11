import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Register design-system theme keys (globals.css @theme) so tailwind-merge
// classifies `text-body` as a font size instead of a colour and does not drop it
// when a `text-on-*` colour class follows.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["caption", "label", "body", "body-lg", "title-sm", "title", "headline", "display", "hero"],
      shadow: ["popover", "modal"],
      ease: ["standard", "exit"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an amount in minor units (cents / paise) in its own currency.
 * Prices are stored per plan/subscription currency — never assume ₹.
 */
export function formatMoney(minorUnits: number, currency = "USD"): string {
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: minorUnits % 100 === 0 ? 0 : 2,
    }).format(minorUnits / 100);
  } catch {
    // Unknown currency code — still show the number
    return `${code} ${(minorUnits / 100).toLocaleString()}`;
  }
}

/**
 * Parse a major-unit amount typed by a user ("12.50") into integer minor units (1250).
 * Returns null unless it is a plain non-negative number with at most 2 decimals.
 */
export function parseMoneyInput(value: string): number | null {
  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, frac = ""] = text.split(".");
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}
