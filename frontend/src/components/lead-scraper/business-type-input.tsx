"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, History, Sparkles, X } from "lucide-react";
import type { SuggestionGroup } from "@/lib/constants/scraper-suggestions";

/** A past search the user can repeat in one click */
export interface RecentSearch {
  keywords: string;
  location?: string;
  resultCount?: number;
}

interface Option {
  key: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  onPick: () => void;
}

interface Section {
  label?: string;
  options: Option[];
}

const MAX_MATCHES = 50;
const MAX_RECENT = 5;

/**
 * No query → recent + every group under its heading.
 * Query → recent that contain it, then one flat list (starts-with first),
 * matching aliases too so "parlour" finds "Beauty salon".
 */
function buildSections({ groups, aliases, recent, suggested, query, exclude, pick, pickRecent }: {
  groups: SuggestionGroup[];
  aliases?: Record<string, string[]>;
  recent?: RecentSearch[];
  suggested?: string[];
  query: string;
  exclude: string[];
  pick: (v: string) => void;
  pickRecent?: (r: RecentSearch) => void;
}): Section[] {
  const q = query.trim().toLowerCase();
  const skip = new Set(exclude.map((e) => e.toLowerCase()));
  const sections: Section[] = [];

  if (recent?.length && pickRecent) {
    const hits = recent
      .filter((r) => !q || r.keywords.toLowerCase().includes(q))
      .slice(0, MAX_RECENT);
    if (hits.length) {
      sections.push({
        label: "Recent",
        options: hits.map((r) => ({
          key: `recent:${r.keywords}|${r.location ?? ""}`,
          label: r.location ? `${r.keywords} · ${r.location}` : r.keywords,
          hint: r.resultCount ? `${r.resultCount} leads` : undefined,
          icon: <History className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />,
          onPick: () => pickRecent(r),
        })),
      });
    }
  }

  const toOption = (item: string, hint?: string): Option => ({ key: item, label: item, hint, onPick: () => pick(item) });

  if (!q) {
    const forYou = (suggested ?? []).filter((i) => !skip.has(i.toLowerCase()));
    if (forYou.length) {
      sections.push({
        label: "Suggested for you",
        options: forYou.map((i) => ({
          ...toOption(i),
          key: `for-you:${i}`,
          icon: <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />,
        })),
      });
    }
    for (const g of groups) {
      const items = g.items.filter((i) => !skip.has(i.toLowerCase()));
      if (items.length) sections.push({ label: g.label, options: items.map((i) => toOption(i)) });
    }
    return sections;
  }

  const starts: Option[] = [];
  const contains: Option[] = [];
  const viaAlias: Option[] = [];
  for (const item of groups.flatMap((g) => g.items)) {
    const name = item.toLowerCase();
    if (skip.has(name)) continue;
    if (name.startsWith(q)) starts.push(toOption(item));
    else if (name.includes(q)) contains.push(toOption(item));
    else {
      const alias = aliases?.[item]?.find((a) => a.includes(q));
      if (alias) viaAlias.push(toOption(item, alias));
    }
  }
  const matches = [...starts, ...contains, ...viaAlias].slice(0, MAX_MATCHES);
  if (matches.length) sections.push({ options: matches });
  return sections;
}

/** Open/close + keyboard highlight shared by both inputs */
function useSuggestions() {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /** Handles arrows/Escape; returns true when the key was consumed */
  const navigate = (e: React.KeyboardEvent, count: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(c + 1, count - 1));
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, -1));
      return true;
    }
    if (e.key === "Escape" && open) {
      setOpen(false);
      return true;
    }
    return false;
  };

  return { open, setOpen, cursor, setCursor, rootRef, navigate, listId };
}

function SuggestionList({ id, sections, cursor, onHover, footer }: {
  id: string; sections: Section[]; cursor: number; onHover: (i: number) => void; footer?: React.ReactNode;
}) {
  if (!sections.length && !footer) return null;
  let index = -1;
  return (
    <ul id={id} role="listbox" className="absolute z-20 mt-1 w-full min-w-[240px] max-h-72 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-low shadow-lg py-1">
      {sections.map((s, si) => (
        <li key={s.label ?? si} role="presentation">
          {s.label && (
            <p className="px-3 pt-2 pb-1 text-caption font-semibold uppercase tracking-wide text-on-surface-variant">{s.label}</p>
          )}
          <ul role="group">
            {s.options.map((o) => {
              const i = ++index;
              return (
                <li
                  key={o.key}
                  role="option"
                  aria-selected={i === cursor}
                  onMouseEnter={() => onHover(i)}
                  // mousedown so the input doesn't blur first
                  onMouseDown={(e) => { e.preventDefault(); o.onPick(); }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-label text-on-surface cursor-pointer ${i === cursor ? "bg-surface-container" : ""}`}
                >
                  {o.icon}
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="text-caption text-on-surface-variant shrink-0">{o.hint}</span>}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
      {footer}
    </ul>
  );
}

const fieldClass =
  "w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-body-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary";

interface SuggestProps {
  groups: SuggestionGroup[];
  aliases?: Record<string, string[]>;
  recent?: RecentSearch[];
  onPickRecent?: (r: RecentSearch) => void;
  /** Shown first when nothing is typed — e.g. picks for the org's line of work */
  suggested?: string[];
}

/** Single value — pick a suggestion or keep whatever was typed */
export function SuggestInput({ groups, aliases, recent, onPickRecent, suggested, value, onChange, onEnter, placeholder }: SuggestProps & {
  value: string; onChange: (v: string) => void; onEnter?: () => void; placeholder?: string;
}) {
  const { open: isOpen, setOpen: setOpenRaw, cursor, setCursor, rootRef, navigate, listId } = useSuggestions();
  const setOpen = (v: boolean) => { setOpenRaw(v); if (!v) setCursor(-1); };
  const sections = buildSections({
    groups, aliases, recent, suggested, query: value, exclude: [],
    pick: (v) => { onChange(v); setOpen(false); },
    pickRecent: onPickRecent && ((r) => { onPickRecent(r); setOpen(false); }),
  });
  const options = sections.flatMap((x) => x.options);

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setCursor(-1); }}
        onKeyDown={(e) => {
          if (navigate(e, options.length)) return;
          if (e.key === "Enter") {
            if (isOpen && options[cursor]) options[cursor].onPick();
            else { setOpen(false); onEnter?.(); }
          }
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        className={`${fieldClass} pr-8`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Show suggestions"
        onMouseDown={(e) => { e.preventDefault(); setOpen(!isOpen); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <SuggestionList id={listId} sections={sections} cursor={cursor} onHover={setCursor} />}
    </div>
  );
}

/**
 * Several values as chips — pick suggestions or add your own with Enter / comma.
 * Pass `text`/`onTextChange` to read the not-yet-added text (e.g. to count it on submit).
 */
export function SuggestMulti({
  groups, aliases, recent, onPickRecent, suggested, value, onChange, placeholder,
  text: textProp, onTextChange, onEnter, large,
}: SuggestProps & {
  value: string[] | undefined;
  onChange: (v: string[] | undefined) => void;
  placeholder: string;
  text?: string;
  onTextChange?: (t: string) => void;
  /** Enter with nothing typed */
  onEnter?: () => void;
  /** Match the size of the main form fields */
  large?: boolean;
}) {
  const selected = value ?? [];
  const [ownText, setOwnText] = useState("");
  const text = textProp ?? ownText;
  const setText = (t: string) => { setOwnText(t); onTextChange?.(t); };
  const { open, setOpen, cursor, setCursor, rootRef, navigate, listId } = useSuggestions();

  const add = (t: string) => {
    const v = t.trim();
    if (v && !selected.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...selected, v]);
    setText("");
    setCursor(-1);
  };
  const remove = (t: string) => {
    const next = selected.filter((x) => x !== t);
    onChange(next.length ? next : undefined);
  };

  const sections = buildSections({
    groups, aliases, recent, suggested, query: text, exclude: selected, pick: add,
    pickRecent: onPickRecent && ((r) => { onPickRecent(r); setText(""); setOpen(false); }),
  });
  const options = sections.flatMap((x) => x.options);

  const typed = text.trim();
  const isCustom = typed && !groups.some((g) => g.items.some((t) => t.toLowerCase() === typed.toLowerCase()));

  return (
    <div ref={rootRef} className={`relative ${large ? "" : "flex-1 min-w-[220px]"}`}>
      <div className={`flex flex-wrap items-center gap-1 border border-outline-variant bg-surface-container focus-within:border-primary ${
        large ? "rounded-xl px-2 py-1.5 min-h-[42px]" : "rounded-lg px-1.5 py-1"
      }`}>
        {selected.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-caption px-2 py-0.5">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => remove(t)} className="hover:text-error">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={text}
          placeholder={selected.length ? "Add another…" : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const v = e.target.value;
            // comma-separated typing still works
            if (v.includes(",")) {
              const parts = v.split(",");
              const rest = parts.pop() ?? "";
              const next = [...selected];
              parts.map((p) => p.trim()).filter(Boolean).forEach((p) => {
                if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
              });
              onChange(next.length ? next : undefined);
              setText(rest);
            } else setText(v);
            setOpen(true);
            setCursor(-1);
          }}
          onKeyDown={(e) => {
            if (navigate(e, options.length)) return;
            if (e.key === "Enter") {
              e.preventDefault();
              if (open && options[cursor]) options[cursor].onPick();
              else if (typed) add(typed);
              else { setOpen(false); onEnter?.(); }
            } else if (e.key === "Backspace" && !text && selected.length) {
              remove(selected[selected.length - 1]);
            }
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className={`flex-1 min-w-[100px] bg-transparent px-1 py-0.5 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none ${
            large ? "text-body-lg" : "text-label"
          }`}
        />
      </div>
      {open && (
        <SuggestionList
          id={listId}
          sections={sections}
          cursor={cursor}
          onHover={setCursor}
          footer={isCustom ? (
            <li
              onMouseDown={(e) => { e.preventDefault(); add(typed); }}
              className="px-3 py-1.5 text-label text-primary cursor-pointer border-t border-outline-variant/40 hover:bg-surface-container"
            >
              ↵ Add &ldquo;{typed}&rdquo;
            </li>
          ) : undefined}
        />
      )}
    </div>
  );
}
