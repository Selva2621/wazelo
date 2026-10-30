"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { BottomSheet } from "@/components/ios/bottom-sheet";

/** Multi-select dropdown for result types — type to narrow the list, or just pick */
export function TypeFilter({ options, value, onChange }: {
  options: { name: string; count: number }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // Phones: the filter row scrolls sideways (it would clip a dropdown), so the list opens as a sheet
  const isMobile = useIsMobile();

  const close = () => { setOpen(false); setQuery(""); setCursor(0); };

  useEffect(() => {
    if (!open || isMobile) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, isMobile]);

  const q = query.trim().toLowerCase();
  const matches = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;

  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, matches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter" && matches[cursor]) { e.preventDefault(); toggle(matches[cursor].name); }
  };

  const label =
    value.length === 0 ? "Type: All" : value.length === 1 ? value[0] : `Type: ${value.length} selected`;

  const searchRow = (
    <div className="flex items-center gap-2 border-b border-outline-variant px-3 py-2">
      <Search className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
      <input
        autoFocus={!isMobile}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
        placeholder="Search types…"
        aria-label="Search types"
        className="flex-1 bg-transparent text-label text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none"
      />
      {query && (
        <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-on-surface-variant hover:text-on-surface">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  const list = (
    <ul role="listbox" aria-multiselectable className={isMobile ? "py-1" : "max-h-64 overflow-y-auto py-1"}>
      {matches.length === 0 ? (
        <li className="px-3 py-2 text-caption text-on-surface-variant">No types match &ldquo;{query}&rdquo;</li>
      ) : (
        matches.map((o, i) => {
          const checked = value.includes(o.name);
          return (
            <li
              key={o.name}
              role="option"
              aria-selected={checked}
              onMouseEnter={() => setCursor(i)}
              onClick={() => toggle(o.name)}
              className={`flex items-center gap-2 px-3 py-1.5 text-label cursor-pointer max-lg:min-h-11 max-lg:px-4 ${
                i === cursor && !isMobile ? "bg-surface-container" : ""
              }`}
            >
              <input type="checkbox" readOnly checked={checked} tabIndex={-1} className="accent-primary w-3.5 h-3.5 pointer-events-none max-lg:size-4" />
              <span className="flex-1 truncate text-on-surface">{o.name}</span>
              <span className="text-caption text-on-surface-variant">{o.count}</span>
            </li>
          );
        })
      )}
    </ul>
  );

  const clearRow = value.length > 0 && (
    <div className="border-t border-outline-variant px-3 py-2">
      <button type="button" onClick={() => onChange([])} className="text-caption text-error hover:underline max-lg:min-h-11 max-lg:text-label">
        Clear selection
      </button>
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex items-center gap-1.5 text-label rounded-lg border pl-3 pr-2 py-1.5 max-w-[220px] transition-colors max-lg:h-8 max-lg:rounded-full max-lg:py-0 max-lg:font-medium ${
          value.length
            ? "bg-primary/10 text-primary border-primary/40"
            : "bg-surface-container text-on-surface border-outline-variant hover:border-primary/50"
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {isMobile ? (
        <BottomSheet
          open={open}
          onClose={close}
          title="Type"
          headerAction={
            <button type="button" onClick={close} className="min-h-11 px-1 text-body-lg font-semibold text-primary">
              Done
            </button>
          }
        >
          <div onKeyDown={onKeyDown}>
            {searchRow}
            {list}
            {clearRow}
          </div>
        </BottomSheet>
      ) : (
        open && (
          <div
            className="absolute z-20 mt-1 w-64 rounded-xl border border-outline-variant bg-surface-container-low shadow-lg"
            onKeyDown={onKeyDown}
          >
            {searchRow}
            {list}
            {clearRow}
          </div>
        )
      )}
    </div>
  );
}
