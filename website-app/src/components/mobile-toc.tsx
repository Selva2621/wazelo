"use client";

import { ChevronDown } from "lucide-react";

/** "On this page" for phones and tablets, where the long-read pages hide their sidebar. */
export function MobileToc({ items }: { items: { id: string; label: string }[] }) {
  return (
    <details className="group mb-10 rounded-2xl border border-ink/10 bg-card/60 lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
        On this page
        <ChevronDown className="h-4 w-4 text-ink-soft transition-transform group-open:rotate-180" />
      </summary>
      <ol className="border-t border-ink/10 p-2">
        {items.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              // Close the list after a jump so the section isn't hidden under it.
              onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
              className="block rounded-lg px-3 py-2.5 text-[15px] text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}
