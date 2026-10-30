"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleDot, Tag, Trash2, UserRoundCog, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/motion-tokens";
import { useAuthStore } from "@/stores/auth-store";
import { useBulkContactAction, useOrgMembers } from "@/hooks/use-contacts";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LeadStatusBadge } from "./lead-status-badge";
import { BULK_CONTACTS_MAX, type LeadStatus } from "@/lib/types/contacts";

const STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "CONVERTED", "CLOSED"];

type Menu = "status" | "assign" | "tag" | null;

interface ContactsBulkBarProps {
  selectedIds: Set<string>;
  onClear: () => void;
}

/** Floating action bar for the contacts list; appears once at least one row is selected. */
export function ContactsBulkBar({ selectedIds, onClear }: ContactsBulkBarProps) {
  const reduceMotion = useReducedMotion();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === "ADMIN" || role === "MANAGER";
  const bulk = useBulkContactAction();
  const [menu, setMenu] = useState<Menu>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const count = selectedIds.size;
  const overLimit = count > BULK_CONTACTS_MAX;

  useEffect(() => {
    if (!menu) return;
    const onPointer = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const run = (input: Parameters<typeof bulk.mutate>[0]) => {
    setMenu(null);
    bulk.mutate(input, {
      onSuccess: (res) => {
        // Keep failed rows selected so the agent can retry or inspect them
        if (res.failed.length === 0) onClear();
      },
    });
  };

  const contactIds = [...selectedIds];
  const toggle = (m: Exclude<Menu, null>) => setMenu((cur) => (cur === m ? null : m));

  return (
    <>
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            ref={barRef}
            role="toolbar"
            aria-label="Bulk actions"
            // Sits above the pagination row. Phones scroll the whole page, so there it floats
            // over the viewport just above the tab bar.
            className="absolute bottom-20 left-1/2 z-30 w-max max-w-[calc(100%-2rem)] max-lg:fixed max-lg:bottom-[calc(var(--mobile-tabbar-h,62px)+var(--safe-bottom,0px)+12px)]"
            initial={reduceMotion ? { opacity: 0, x: "-50%" } : { opacity: 0, x: "-50%", y: 16 }}
            animate={{ opacity: 1, x: "-50%", y: 0, transition: springs.gentle }}
            exit={{ opacity: 0, x: "-50%", y: reduceMotion ? 0 : 16 }}
          >
            <div className="flex items-center gap-1 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-1.5 shadow-modal">
              <span className="px-2.5 text-body font-semibold text-on-surface tabular-nums whitespace-nowrap">
                {count} selected
              </span>
              <span aria-hidden className="mx-1 h-5 w-px bg-outline-variant/40" />

              <BarMenu
                open={menu === "status"}
                onToggle={() => toggle("status")}
                icon={<CircleDot className="h-4 w-4" />}
                label="Status"
                disabled={overLimit || bulk.isPending}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} onClick={() => run({ action: "status", contactIds, status: s })}>
                    <LeadStatusBadge status={s} />
                  </MenuItem>
                ))}
              </BarMenu>

              {canManage && (
                <BarMenu
                  open={menu === "assign"}
                  onToggle={() => toggle("assign")}
                  icon={<UserRoundCog className="h-4 w-4" />}
                  label="Assign"
                  disabled={overLimit || bulk.isPending}
                >
                  <OwnerOptions onPick={(ownerId) => run({ action: "assign", contactIds, ownerId })} />
                </BarMenu>
              )}

              <BarMenu
                open={menu === "tag"}
                onToggle={() => toggle("tag")}
                icon={<Tag className="h-4 w-4" />}
                label="Tag"
                disabled={overLimit || bulk.isPending}
              >
                <TagForm onSubmit={(name) => run({ action: "tags", contactIds, name })} />
              </BarMenu>

              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  disabled={overLimit || bulk.isPending}
                  aria-label="Delete"
                  className="text-error hover:bg-error/10 hover:text-error"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}

              <span aria-hidden className="mx-1 h-5 w-px bg-outline-variant/40" />
              <IconButton size="sm" onClick={onClear} aria-label="Clear selection" title="Clear selection">
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            {overLimit && (
              <p className="mt-2 text-center text-caption text-error">
                Select up to {BULK_CONTACTS_MAX} contacts at a time.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${count} contact${count === 1 ? "" : "s"}?`}
        message="They'll be removed from your contact list. Conversation history is kept for audit purposes."
        confirmLabel="Delete"
        variant="danger"
        loading={bulk.isPending}
        onConfirm={() =>
          bulk.mutate(
            { action: "delete", contactIds },
            {
              onSuccess: (res) => {
                setConfirmDelete(false);
                if (res.failed.length === 0) onClear();
              },
            },
          )
        }
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

function BarMenu({
  open,
  onToggle,
  icon,
  label,
  disabled,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={cn(open && "bg-primary/10 text-primary")}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 mb-2 w-56 max-h-72 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-1 shadow-popover"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-body text-on-surface transition-colors hover:bg-surface-container focus-visible:bg-surface-container"
    >
      {children}
    </button>
  );
}

function OwnerOptions({ onPick }: { onPick: (ownerId: string) => void }) {
  const { data: members, isLoading } = useOrgMembers();

  if (isLoading) {
    return <p className="px-2.5 py-2 text-label text-on-surface-variant">Loading team…</p>;
  }
  return (
    <>
      {(members ?? []).map((m) => (
        <MenuItem key={m.id} onClick={() => onPick(m.id)}>
          <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
          <span className="truncate">
            {m.firstName} {m.lastName}
          </span>
        </MenuItem>
      ))}
    </>
  );
}

function TagForm({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");
  const valid = /^[a-zA-Z0-9\s\-_]{1,100}$/.test(name.trim());

  return (
    <form
      className="p-1.5 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(name.trim());
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tag name"
        aria-label="Tag name"
        maxLength={100}
        className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2.5 text-body text-on-surface placeholder:text-placeholder outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      <Button type="submit" size="sm" className="w-full" disabled={!valid}>
        Add tag
      </Button>
    </form>
  );
}
