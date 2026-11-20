"use client";

import type { Currency } from "./plans";
import { setCurrency } from "./use-currency";

// "Prices in USD · Show ₹ INR": lets a visitor correct the time-zone guess.
export function CurrencySwitch({ currency, tone = "ink" }: { currency: Currency | null; tone?: "ink" | "paper" }) {
  if (!currency) return <p className="h-5 text-sm" aria-hidden />;
  const other: Currency = currency === "INR" ? "USD" : "INR";
  const muted = tone === "paper" ? "text-paper/60" : "text-ink-soft";
  const accent = tone === "paper" ? "text-[#f0b483]" : "text-rust";
  const ring = tone === "paper" ? "focus-visible:outline-paper" : "focus-visible:outline-ink";
  return (
    <p className={`h-5 text-sm ${muted}`}>
      Prices in {currency === "INR" ? "₹ INR" : "$ USD"} ·{" "}
      <button
        type="button"
        onClick={() => setCurrency(other)}
        className={`rounded font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 ${accent} ${ring}`}
      >
        Show {other === "INR" ? "₹ INR" : "$ USD"}
      </button>
    </p>
  );
}
