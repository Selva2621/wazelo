"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSAGlobalSearch } from "@/hooks/use-super-admin";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchInput } from "@/components/ui/search-input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/super-admin/status-badge";
import type { SAGlobalSearchResult } from "@/lib/api/super-admin";
import { cn } from "@/lib/utils";

const MIN_CHARS = 2;

interface ResultItem {
  key: string;
  href: string;
  label: string;
  sub?: string;
  badge?: ReactNode;
}

interface ResultGroup {
  label: string;
  items: ResultItem[];
}

const orgHref = (id: string) => `/super-admin/organizations/${id}`;

function toGroups(r: SAGlobalSearchResult): ResultGroup[] {
  const groups: ResultGroup[] = [
    {
      label: "Organizations",
      items: r.orgs.map((o) => ({
        key: `org-${o.id}`,
        href: orgHref(o.id),
        label: o.name,
        sub: o.slug,
        badge: o.deletedAt ? <Badge variant="error">Deleted</Badge> : undefined,
      })),
    },
    {
      label: "Users",
      items: r.users.map((u) => ({
        key: `user-${u.id}`,
        href: orgHref(u.organization.id),
        label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
        sub: `${u.email} · ${u.organization.name}`,
      })),
    },
    {
      label: "WhatsApp numbers",
      items: r.phoneNumbers.map((p) => ({
        key: `phone-${p.id}`,
        href: orgHref(p.organization.id),
        label: p.phoneNumber,
        sub: p.organization.name,
        badge: <StatusBadge status={p.status} />,
      })),
    },
    {
      label: "Tickets",
      items: r.tickets.map((t) => ({
        key: `ticket-${t.id}`,
        href: `/super-admin/tickets/${t.id}`,
        label: t.title,
        sub: t.organization.name,
        badge: <StatusBadge status={t.status} />,
      })),
    },
    {
      label: "Invoices",
      items: r.invoices.map((i) => ({
        key: `invoice-${i.id}`,
        href: orgHref(i.organization.id),
        label: i.invoiceNumber,
        sub: i.organization.name,
        badge: <StatusBadge status={i.status} />,
      })),
    },
  ];
  return groups.filter((g) => g.items.length > 0);
}

function detectShortcutHint(): string | undefined {
  if (typeof window === "undefined") return undefined;
  // No point advertising a keyboard shortcut on touch-only devices
  if (!window.matchMedia?.("(pointer: fine)").matches) return undefined;
  return /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K";
}

/** Platform-wide search box with grouped results (combobox + listbox). Ctrl/Cmd+K focuses it. */
export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [shortcutHint] = useState(detectShortcutHint);

  const term = useDebounce(query.trim(), 250);
  const ready = term.length >= MIN_CHARS;
  const { data, isFetching, isError } = useSAGlobalSearch(term);

  const groups = useMemo(() => (ready && data ? toGroups(data) : []), [ready, data]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  // Results belong to the settled term (placeholder data may still be the previous one)
  const settled = ready && data?.query === term && !isFetching;
  const typing = query.trim() !== term;

  // Reset the highlighted row whenever the result set changes
  const [prevFlat, setPrevFlat] = useState(flat);
  if (prevFlat !== flat) {
    setPrevFlat(flat);
    setActive(-1);
  }

  // Close (and clear) after navigating anywhere
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
    setQuery("");
  }

  // Ctrl/Cmd+K focuses the box from anywhere in the portal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click outside closes
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const go = (item: ResultItem) => {
    setOpen(false);
    router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      } else {
        inputRef.current?.blur();
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (flat.length === 0) return;
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const next = active === -1 && dir === -1 ? flat.length - 1 : (active + dir + flat.length) % flat.length;
      setActive(next);
      document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Enter" && open && flat.length > 0) {
      e.preventDefault();
      go(flat[active >= 0 ? active : 0]);
    }
  };

  const showPanel = open && query.trim().length > 0;
  // Index of each group's first item in `flat`, for option ids and keyboard focus
  const starts = groups.map((_, gi) => groups.slice(0, gi).reduce((n, g) => n + g.items.length, 0));

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <SearchInput
        ref={inputRef}
        role="combobox"
        aria-label="Search orgs, users, numbers, tickets and invoices"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel && active >= 0 ? optionId(active) : undefined}
        placeholder="Search orgs, users, numbers…"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        shortcutHint={shortcutHint}
      />

      {showPanel && (
        <div className="absolute left-0 right-0 md:right-auto md:w-[28rem] top-full mt-1.5 z-40 rounded-xl bg-surface-container shadow-popover max-h-[70vh] overflow-y-auto p-1.5">
          {query.trim().length < MIN_CHARS ? (
            <p className="px-3 py-2 text-label text-on-surface-variant">Type at least 2 characters</p>
          ) : isError && !typing && !isFetching ? (
            <p className="px-3 py-2 text-label text-error" role="alert">Search failed. Try again.</p>
          ) : !settled && flat.length === 0 ? (
            <p className="flex items-center gap-2 px-3 py-2 text-label text-on-surface-variant" role="status">
              <Spinner className="h-3.5 w-3.5" /> Searching…
            </p>
          ) : settled && !typing && flat.length === 0 ? (
            <p className="px-3 py-2 text-label text-on-surface-variant" role="status">
              No matches for “{term}”
            </p>
          ) : null}

          <div id={listboxId} role="listbox" aria-label="Search results" aria-busy={!settled || undefined}>
            {groups.map((g, gi) => {
              const headingId = `${listboxId}-${g.label.replace(/\s+/g, "-")}`;
              return (
                <div key={g.label} role="group" aria-labelledby={headingId} className="py-1">
                  <p id={headingId} className="px-3 pt-1 pb-0.5 text-caption font-medium text-on-surface-variant">
                    {g.label}
                  </p>
                  {g.items.map((item, j) => {
                    const i = starts[gi] + j;
                    const selected = i === active;
                    return (
                      <Link
                        key={item.key}
                        id={optionId(i)}
                        href={item.href}
                        role="option"
                        aria-selected={selected}
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()} // keep focus in the input
                        onMouseEnter={() => setActive(i)}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-body text-on-surface",
                          selected ? "bg-surface-container-high" : "hover:bg-surface-container-high",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{item.label}</span>
                          {item.sub && (
                            <span className="block truncate text-caption text-on-surface-variant">{item.sub}</span>
                          )}
                        </span>
                        {item.badge && <span className="shrink-0">{item.badge}</span>}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
