"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Pencil, ShieldCheck, Square, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { LoadError } from "@/components/ui/empty-state";
import {
  useCreateSavedContactGroups,
  useDeleteSavedGroup,
  useGroupWaCheck,
  useMoveToSavedGroup,
  useRenameSavedGroup,
  useSavedContactGroups,
  useSavedGroupMoveImpact,
  useSplitIntoSavedGroups,
  useUngroupedContactsCount,
} from "@/hooks/use-contacts";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { groupNamesSummary } from "./saved-group-actions";
import {
  SAVED_GROUP_DEFAULT_SIZE,
  SAVED_GROUP_MAX_CONTACTS,
  SAVED_GROUP_MAX_SIZE,
  type SavedContactGroup,
  type SavedGroupMoveImpact,
} from "@/lib/types/contacts";

const fmt = (n: number) => n.toLocaleString();
const plural = (n: number, word: string) => `${fmt(n)} ${word}${n === 1 ? "" : "s"}`;

/** Next free number for "<prefix> N" (same rule as the server): "Group 1", "Group 7" → 8 */
function nextGroupNumber(prefix: string, names: string[]): number {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (\\d+)$`);
  return names.reduce((max, name) => {
    const match = pattern.exec(name);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
}

const builderSchema = z
  .object({
    who: z.enum(["ungrouped", "selected"]),
    how: z.enum(["split", "one", "move"]),
    groupSize: z.string(),
    name: z.string().max(100, { error: "100 characters at most" }),
    targetId: z.string(),
    moveGrouped: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.how === "split") {
      const size = Number(v.groupSize);
      if (!Number.isInteger(size) || size < 1 || size > SAVED_GROUP_MAX_SIZE) {
        ctx.addIssue({ code: "custom", path: ["groupSize"], message: `1 to ${fmt(SAVED_GROUP_MAX_SIZE)}` });
      }
      if (v.name.trim().length > 80) ctx.addIssue({ code: "custom", path: ["name"], message: "80 characters at most" });
    }
    if (v.how === "one" && !v.name.trim()) ctx.addIssue({ code: "custom", path: ["name"], message: "Enter a name" });
    if (v.how === "move" && !v.targetId) ctx.addIssue({ code: "custom", path: ["targetId"], message: "Pick a group" });
  });

type BuilderForm = z.infer<typeof builderSchema>;

interface GroupsPanelProps {
  open: boolean;
  onClose: () => void;
  /** Contacts ticked on the page (may be empty) */
  selectedIds: string[];
  /** Opened from the bulk bar: start with "Selected" */
  startWithSelection: boolean;
  /** The selection was grouped / moved: clear it */
  onSelectionUsed: () => void;
}

/**
 * The one place for saved groups (one campaign batch each): make groups at the top,
 * your groups below. A contact is in one group at most.
 */
export function GroupsPanel({ open, onClose, selectedIds, startWithSelection, onSelectionUsed }: GroupsPanelProps) {
  const remove = useDeleteSavedGroup();
  const removeFromGroups = useMoveToSavedGroup();
  const [toDelete, setToDelete] = useState<SavedContactGroup | null>(null);
  const [toRemove, setToRemove] = useState<SavedGroupMoveImpact | null>(null);

  // Focus goes back to whatever opened the panel (header button, bulk bar)
  const returnTo = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return;
    }
    const el = returnTo.current;
    returnTo.current = null;
    if (el?.isConnected) requestAnimationFrame(() => el.focus());
  }, [open]);

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        // While a confirm is up, Escape / backdrop close only that
        dismissible={!toDelete && !toRemove}
        aria-labelledby="groups-panel-title"
        className="lg:max-w-md"
      >
        {() => (
          <PanelBody
            onClose={onClose}
            selectedIds={selectedIds}
            startWithSelection={startWithSelection}
            onSelectionUsed={onSelectionUsed}
            onDelete={setToDelete}
            onRemove={setToRemove}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={!!toDelete}
        title={toDelete ? `Delete "${toDelete.name}"?` : "Delete group?"}
        message="Contacts stay; they just leave this group."
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        onCancel={() => setToDelete(null)}
      />
      <ConfirmDialog
        open={!!toRemove}
        variant="warning"
        title={`Remove ${plural(toRemove?.alreadyGrouped ?? 0, "contact")} from groups?`}
        message={`They'll leave ${groupNamesSummary(toRemove?.groups ?? [])}.`}
        confirmLabel="Remove"
        loading={removeFromGroups.isPending}
        onConfirm={() =>
          removeFromGroups.mutate(
            { contactIds: selectedIds, groupId: null },
            {
              onSuccess: () => {
                setToRemove(null);
                onSelectionUsed();
              },
            },
          )
        }
        onCancel={() => setToRemove(null)}
      />
    </>
  );
}

function PanelBody({
  onClose,
  selectedIds,
  startWithSelection,
  onSelectionUsed,
  onDelete,
  onRemove,
}: {
  onClose: () => void;
  selectedIds: string[];
  startWithSelection: boolean;
  onSelectionUsed: () => void;
  onDelete: (group: SavedContactGroup) => void;
  onRemove: (impact: SavedGroupMoveImpact) => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => titleRef.current?.focus(), []);
  const groupsQuery = useSavedContactGroups();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/40 px-5 py-4">
        <h2
          id="groups-panel-title"
          ref={titleRef}
          tabIndex={-1}
          className="text-title-sm font-semibold text-on-surface outline-none"
        >
          Groups
        </h2>
        <IconButton size="sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" aria-hidden />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <GroupBuilder
          groups={groupsQuery.data ?? []}
          selectedIds={selectedIds}
          startWithSelection={startWithSelection}
          onSelectionUsed={onSelectionUsed}
          onRemove={onRemove}
        />
        <GroupsList query={groupsQuery} onDelete={onDelete} />
      </div>
    </div>
  );
}

// ─── Make groups ───

function GroupBuilder({
  groups,
  selectedIds,
  startWithSelection,
  onSelectionUsed,
  onRemove,
}: {
  groups: SavedContactGroup[];
  selectedIds: string[];
  startWithSelection: boolean;
  onSelectionUsed: () => void;
  onRemove: (impact: SavedGroupMoveImpact) => void;
}) {
  const n = selectedIds.length;
  const ungroupedQuery = useUngroupedContactsCount();
  const split = useSplitIntoSavedGroups();
  const create = useCreateSavedContactGroups();
  const move = useMoveToSavedGroup();
  const pending = split.isPending || create.isPending || move.isPending;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<BuilderForm>({
    resolver: zodResolver(builderSchema),
    defaultValues: {
      who: startWithSelection && n > 0 ? "selected" : "ungrouped",
      how: "split",
      groupSize: String(SAVED_GROUP_DEFAULT_SIZE),
      name: "Group",
      targetId: "",
      moveGrouped: false,
    },
  });
  const values = useWatch({ control });

  // Selection cleared (or never there): only "Not in a group yet" applies
  const who = n === 0 ? "ungrouped" : values.who ?? "ungrouped";
  const how = who === "ungrouped" && values.how === "move" ? "split" : values.how ?? "split";
  const targetId = values.targetId ?? "";
  const target = groups.find((g) => g.id === targetId);

  // Where the selected contacts are now (all groups), and which would lose them on a move
  const baseImpact = useSavedGroupMoveImpact(selectedIds, undefined, who === "selected");
  const targetImpact = useSavedGroupMoveImpact(selectedIds, targetId || undefined, who === "selected" && how === "move" && !!targetId);
  const alreadyGrouped = baseImpact.data?.alreadyGrouped ?? 0;
  const leavingOnMove = targetImpact.data;

  const size = Number(values.groupSize);
  const sizeOk = Number.isInteger(size) && size >= 1 && size <= SAVED_GROUP_MAX_SIZE;
  const ungrouped = ungroupedQuery.data ?? 0;
  const total =
    who === "ungrouped"
      ? Math.min(ungrouped, SAVED_GROUP_MAX_CONTACTS)
      : how === "move" || values.moveGrouped
        ? n
        : Math.max(0, n - alreadyGrouped);
  const groupCount = how === "split" ? (sizeOk ? Math.ceil(total / size) : 0) : how === "one" && total > 0 ? 1 : 0;

  const prefix = (values.name ?? "").trim() || "Group";
  const start = nextGroupNumber(prefix, groups.map((g) => g.name));
  const nameHint =
    how === "split" && groupCount > 0
      ? groupCount === 1
        ? `${prefix} ${start}`
        : `${prefix} ${start} … ${prefix} ${start + groupCount - 1}`
      : undefined;

  const loadingCounts = who === "ungrouped" ? ungroupedQuery.isLoading : baseImpact.isLoading;
  const summary = loadingCounts
    ? ""
    : how === "move"
      ? target
        ? `→ ${plural(n, "contact")} to ${target.name}`
        : ""
      : total === 0
        ? who === "ungrouped"
          ? "Everyone is in a group"
          : "All already in a group"
        : `→ ${plural(groupCount, "group")} · ${plural(total, "contact")}`;

  const submitLabel = how === "move" ? "Move contacts" : groupCount === 1 || how === "one" ? "Create group" : "Create groups";

  const doneWithSelection = () => {
    onSelectionUsed();
    setValue("moveGrouped", false);
    pickWho("ungrouped");
  };

  const onSubmit = (form: BuilderForm) => {
    const name = form.name.trim();
    if (who === "ungrouped") {
      split.mutate({
        mode: how === "one" ? "one" : "split",
        groupSize: how === "split" ? size : undefined,
        prefix: name || "Group",
      });
    } else if (how === "move") {
      move.mutate(
        { contactIds: selectedIds, groupId: form.targetId, groupName: target?.name },
        { onSuccess: doneWithSelection },
      );
    } else {
      create.mutate(
        {
          name: name || "Group",
          contactIds: selectedIds,
          mode: how,
          groupSize: how === "split" ? size : undefined,
          onlyUngrouped: !form.moveGrouped,
        },
        { onSuccess: doneWithSelection },
      );
    }
  };

  const nameRules = register("name");

  const pickWho = (next: BuilderForm["who"]) => {
    setValue("who", next);
    if (next === "ungrouped" && getValues("how") === "move") pickHow("split");
  };
  // Split names "<name> N" and defaults to "Group"; one group needs its own name
  const pickHow = (next: BuilderForm["how"]) => {
    const name = getValues("name").trim();
    if (next === "one" && name === "Group") setValue("name", "");
    if (next === "split" && !name) setValue("name", "Group");
    setValue("how", next);
  };

  return (
    <form
      data-tour="groups-builder"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4 px-5 py-4"
      aria-labelledby="groups-make-heading"
    >
      <h3 id="groups-make-heading" className="text-label font-medium text-on-surface-variant">
        Make groups
      </h3>

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-body font-medium text-on-surface">Who</legend>
        <Radio name="groups-who" checked={who === "ungrouped"} onChange={() => pickWho("ungrouped")}>
          Not in a group yet
          <Count loading={ungroupedQuery.isLoading} value={ungrouped} />
        </Radio>
        <Radio name="groups-who" checked={who === "selected"} disabled={n === 0} onChange={() => pickWho("selected")}>
          Selected
          <Count value={n} />
        </Radio>
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-body font-medium text-on-surface">How</legend>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Radio name="groups-how" checked={how === "split"} onChange={() => pickHow("split")}>
            Split
          </Radio>
          <div className="flex items-start gap-1.5">
            <div className="w-20">
            <Input
              id="groups-size"
              type="number"
              inputMode="numeric"
              min={1}
              max={SAVED_GROUP_MAX_SIZE}
              step={1}
              aria-label="Contacts per group"
              disabled={how !== "split"}
              error={how === "split" ? errors.groupSize?.message : undefined}
              className="h-8 text-body"
              {...register("groupSize")}
            />
            </div>
            <span aria-hidden className="text-body leading-8 text-on-surface-variant">
              per group
            </span>
          </div>
        </div>
        <Radio name="groups-how" checked={how === "one"} onChange={() => pickHow("one")}>
          One group
        </Radio>
        {who === "selected" && (
          <Radio name="groups-how" checked={how === "move"} onChange={() => pickHow("move")}>
            Move to existing group
          </Radio>
        )}
      </fieldset>

      {how === "move" ? (
        <div className="space-y-1.5">
          <Label htmlFor="groups-target">Group</Label>
          <Controller
            control={control}
            name="targetId"
            render={({ field }) => (
              <Select
                id="groups-target"
                value={field.value}
                onValueChange={field.onChange}
                placeholder="Pick a group"
                aria-invalid={!!errors.targetId}
                aria-describedby={errors.targetId ? "groups-target-error" : undefined}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id} data-hint={String(g.contactCount)}>
                    {g.name}
                  </option>
                ))}
              </Select>
            )}
          />
          {errors.targetId && (
            <p id="groups-target-error" role="alert" className="text-caption text-error">
              {errors.targetId.message}
            </p>
          )}
          {leavingOnMove && leavingOnMove.alreadyGrouped > 0 && (
            <p className="text-caption text-warning">
              {plural(leavingOnMove.alreadyGrouped, "contact")} will leave {groupNamesSummary(leavingOnMove.groups)}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="groups-name">Name</Label>
          <Input
            id="groups-name"
            maxLength={how === "split" ? 80 : 100}
            placeholder={how === "one" ? "e.g. Diwali VIPs" : "Group"}
            error={errors.name?.message}
            aria-describedby={errors.name ? "groups-name-error" : nameHint ? "groups-name-hint" : undefined}
            {...nameRules}
          />
          {nameHint && !errors.name && (
            <p id="groups-name-hint" className="text-caption text-on-surface-variant tabular-nums">
              {nameHint}
            </p>
          )}
        </div>
      )}

      {who === "selected" && how !== "move" && alreadyGrouped > 0 && (
        <div className="space-y-1">
          <p className={cn("text-caption", values.moveGrouped ? "text-warning" : "text-on-surface-variant")}>
            {fmt(alreadyGrouped)} already in a group —{" "}
            {values.moveGrouped
              ? `they'll leave ${groupNamesSummary(baseImpact.data?.groups ?? [])}`
              : "left where they are"}
          </p>
          <label className="flex min-h-8 cursor-pointer items-center gap-2 text-body text-on-surface">
            <input type="checkbox" className="h-4 w-4 accent-primary" {...register("moveGrouped")} />
            Move them here instead
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p aria-live="polite" className="min-w-0 text-body text-on-surface-variant tabular-nums">
          {summary}
        </p>
        <Button type="submit" size="sm" loading={pending} disabled={(how !== "move" && total === 0) || loadingCounts}>
          {submitLabel}
        </Button>
      </div>

      {who === "selected" && alreadyGrouped > 0 && baseImpact.data && (
        <Button
          type="button"
          variant="link"
          className="text-caption text-on-surface-variant"
          onClick={() => baseImpact.data && onRemove(baseImpact.data)}
        >
          Remove from group
        </Button>
      )}
    </form>
  );
}

function Count({ value, loading }: { value: number; loading?: boolean }) {
  return (
    <span className="tabular-nums text-on-surface-variant">
      {" "}· {loading ? "…" : fmt(value)}
    </span>
  );
}

type RadioProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { children: React.ReactNode };

function Radio({ children, className, disabled, ...props }: RadioProps) {
  return (
    <label
      className={cn(
        "flex min-h-8 items-center gap-2 text-body text-on-surface",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <input type="radio" disabled={disabled} className="h-4 w-4 accent-primary" {...props} />
      <span>{children}</span>
    </label>
  );
}

// ─── Your groups ───

function GroupsList({
  query,
  onDelete,
}: {
  query: ReturnType<typeof useSavedContactGroups>;
  onDelete: (group: SavedContactGroup) => void;
}) {
  const role = useAuthStore((s) => s.user?.role);
  // Groups are shared across the workspace; employees can't rename or delete them
  const canManage = role === "ADMIN" || role === "MANAGER";
  const rename = useRenameSavedGroup();
  const waCheck = useGroupWaCheck();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data: groups, isLoading, isError, refetch } = query;

  const list = (groups ?? []).filter((g) => g.name.toLowerCase().includes(search.trim().toLowerCase()));
  const total = (groups ?? []).reduce((sum, g) => sum + g.contactCount, 0);

  return (
    <section data-tour="groups-list" aria-labelledby="groups-list-heading" className="border-t border-outline-variant/40 px-5 py-4">
      <h3 id="groups-list-heading" className="mb-2 text-label font-medium text-on-surface-variant">
        Your groups
        {!!groups?.length && (
          <span className="ml-1.5 font-normal tabular-nums">
            {groups.length} · {fmt(total)} contacts
          </span>
        )}
      </h3>

      {(groups?.length ?? 0) > 8 && (
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find group"
          aria-label="Find group"
          className="mb-2 w-full"
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : isError ? (
        <LoadError what="groups" onRetry={() => refetch()} />
      ) : (groups?.length ?? 0) === 0 ? (
        <p className="py-6 text-center text-body text-on-surface-variant">No groups yet.</p>
      ) : (
        <ul className="-mx-2" aria-label="Saved groups">
          {list.map((g) => (
            <li key={g.id}>
              {editingId === g.id ? (
                <RenameRow
                  group={g}
                  saving={rename.isPending}
                  onCancel={() => setEditingId(null)}
                  onSave={(name) => rename.mutate({ groupId: g.id, name }, { onSuccess: () => setEditingId(null) })}
                />
              ) : (
                <div className="flex min-h-11 items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-surface-container-low">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-body text-on-surface">{g.name}</span>
                      <span className="tabular-nums text-label text-on-surface-variant">{fmt(g.contactCount)}</span>
                    </div>
                    <WaStatusLine group={g} />
                  </div>
                  <WaCheckButton group={g} start={waCheck.start} stop={waCheck.stop} />
                  {canManage && (
                    <>
                      <IconButton size="sm" onClick={() => setEditingId(g.id)} aria-label={`Rename ${g.name}`}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                      <IconButton size="sm" variant="danger" onClick={() => onDelete(g)} aria-label={`Delete ${g.name}`}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </IconButton>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RenameRow({
  group,
  saving,
  onSave,
  onCancel,
}: {
  group: SavedContactGroup;
  saving: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(group.name);
  const trimmed = name.trim();
  const inputId = `rename-group-${group.id}`;

  return (
    <form
      className="flex min-h-11 items-center gap-1.5 px-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed || saving) return;
        if (trimmed === group.name) onCancel();
        else onSave(trimmed);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Group name
      </label>
      <input
        id={inputId}
        autoFocus
        value={name}
        maxLength={100}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          // Escape cancels the rename only, not the whole panel
          if (e.key === "Escape") {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            onCancel();
          }
        }}
        className="h-9 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-2.5 text-body text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      <IconButton size="sm" type="submit" aria-label="Save name" disabled={!trimmed || saving}>
        <Check className="h-4 w-4" aria-hidden />
      </IconButton>
      <IconButton size="sm" type="button" onClick={onCancel} aria-label="Cancel rename" disabled={saving}>
        <X className="h-4 w-4" aria-hidden />
      </IconButton>
    </form>
  );
}

const CHECK_ENDED: Record<string, string> = {
  day_limit: "Paused: daily check limit reached, continue tomorrow",
  no_session: "Paused: connect a WhatsApp number to continue",
  stopped: "Check stopped",
};

/** "92 on WhatsApp · 8 not on WhatsApp · 0 unchecked", or progress while checking. */
function WaStatusLine({ group }: { group: SavedContactGroup }) {
  const wa = group.whatsapp;
  if (!wa) return null;
  const checked = wa.on + wa.off;
  const running = group.waCheck?.state === "running";
  const ended = group.waCheck?.state ? CHECK_ENDED[group.waCheck.state] : undefined;

  if (running) {
    return (
      <p className="text-caption text-on-surface-variant" aria-live="polite">
        Checking numbers… <span className="tabular-nums">{checked}/{group.contactCount}</span>
      </p>
    );
  }
  if (checked === 0) {
    return <p className="text-caption text-on-surface-variant">{ended ?? "Numbers not checked"}</p>;
  }
  return (
    <p className="text-caption text-on-surface-variant">
      <span className="tabular-nums">{wa.on}</span> on WhatsApp
      {wa.off > 0 && (
        <span className="text-error">
          {" "}· <span className="tabular-nums">{wa.off}</span> not on WhatsApp (skipped)
        </span>
      )}
      {wa.unchecked > 0 && (
        <>
          {" "}· <span className="tabular-nums">{wa.unchecked}</span> unchecked
        </>
      )}
      {ended && wa.unchecked > 0 && <span className="block">{ended}</span>}
    </p>
  );
}

/** Start / stop the background check. Hidden once every number has an answer. */
function WaCheckButton({
  group,
  start,
  stop,
}: {
  group: SavedContactGroup;
  start: ReturnType<typeof useGroupWaCheck>["start"];
  stop: ReturnType<typeof useGroupWaCheck>["stop"];
}) {
  const running = group.waCheck?.state === "running";
  if (running) {
    return (
      <IconButton
        size="sm"
        onClick={() => stop.mutate(group.id)}
        disabled={stop.isPending}
        aria-label={`Stop checking ${group.name}`}
        title="Stop checking"
      >
        <Square className="h-3.5 w-3.5" aria-hidden />
      </IconButton>
    );
  }
  if (group.whatsapp && group.whatsapp.unchecked === 0) return null;
  return (
    <IconButton
      size="sm"
      onClick={() => start.mutate(group.id)}
      disabled={start.isPending}
      aria-label={`Check ${group.name} numbers on WhatsApp`}
      title="Check numbers on WhatsApp"
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
    </IconButton>
  );
}
