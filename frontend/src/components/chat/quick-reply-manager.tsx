"use client";

import { useId, useState, type FormEvent } from "react";
import { MessageSquareText, Pencil, Plus, Trash2, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchInput } from "@/components/ui/search-input";
import {
  useCannedResponses,
  useCreateCannedResponse,
  useDeleteCannedResponse,
  useUpdateCannedResponse,
} from "@/hooks/use-canned-responses";
import type { CannedResponse } from "@/lib/types/canned-responses";
import { rankByWords, titleFrom } from "@/lib/text-match";

export interface QuickReplyDraft {
  content: string;
  title?: string;
}

interface QuickReplyManagerProps {
  open: boolean;
  onClose: () => void;
  /** Opens straight on the add form, filled with this text (e.g. an AI suggestion) */
  draft?: QuickReplyDraft | null;
}

const SHORTCUT = /^[a-z0-9_-]*$/i;

function errorText(err: unknown, fallback: string) {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  return (Array.isArray(msg) ? msg[0] : msg) || fallback;
}

/** "Website price" → "website-price" (a suggested shortcut) */
function shortcutFrom(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

/**
 * Saved replies anyone can drop into a chat by typing "/" in the message box.
 * Free to use: no AI involved.
 */
export function QuickReplyManager({
  open,
  onClose,
  draft,
}: QuickReplyManagerProps) {
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      className="max-w-lg max-h-[85vh] overflow-y-auto p-6"
    >
      {/* Mounted on each open, so every open starts fresh (and a draft opens the filled-in form) */}
      {() => <ManagerBody titleId={titleId} draft={draft} onClose={onClose} />}
    </Modal>
  );
}

function ManagerBody({
  titleId,
  draft,
  onClose,
}: {
  titleId: string;
  draft?: QuickReplyDraft | null;
  onClose: () => void;
}) {
  const { data: replies = [], isLoading } = useCannedResponses();
  const create = useCreateCannedResponse();
  const update = useUpdateCannedResponse();
  const remove = useDeleteCannedResponse();

  const draftTitle = draft?.content
    ? (draft.title ?? titleFrom(draft.content))
    : "";
  const [search, setSearch] = useState("");
  // null = list view; "new" = add form; a reply = edit form
  const [editing, setEditing] = useState<CannedResponse | "new" | null>(
    draft?.content ? "new" : null,
  );
  const [form, setForm] = useState({
    title: draftTitle,
    shortcut: draftTitle ? shortcutFrom(draftTitle) : "",
    content: draft?.content ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CannedResponse | null>(null);

  function startNew() {
    setForm({ title: "", shortcut: "", content: "" });
    setError(null);
    setEditing("new");
  }

  function startEdit(r: CannedResponse) {
    setForm({ title: r.title, shortcut: r.shortcut ?? "", content: r.content });
    setError(null);
    setEditing(r);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();
    const shortcut = form.shortcut.trim().replace(/^\//, "");
    if (!title || !content) return setError("Add a name and the message.");
    if (!SHORTCUT.test(shortcut))
      return setError(
        "Shortcut can use letters, numbers, - and _ only (no spaces).",
      );

    const done = (msg: string) => {
      toast.success(msg);
      setEditing(null);
      // Opened only to save one reply: close when it's saved
      if (draft) onClose();
    };
    const fail = (err: unknown) =>
      setError(errorText(err, "Couldn't save. Try again."));

    if (editing && editing !== "new") {
      update.mutate(
        {
          id: editing.id,
          data: { title, content, shortcut: shortcut || undefined },
        },
        { onSuccess: () => done("Quick reply updated"), onError: fail },
      );
    } else {
      create.mutate(
        { title, content, shortcut: shortcut || undefined },
        {
          onSuccess: () =>
            done(
              shortcut
                ? `Saved. Type /${shortcut} in any chat to use it.`
                : "Saved. Type / in any chat to use it.",
            ),
          onError: fail,
        },
      );
    }
  }

  const saving = create.isPending || update.isPending;
  const shown = search
    ? rankByWords(
        replies,
        search,
        (r) => [
          { text: r.title, weight: 3 },
          { text: r.shortcut ?? "", weight: 3 },
          { text: r.content, weight: 1 },
        ],
        100,
      )
    : replies;

  return (
    <>
      {
        <>
          <div className="mb-4 flex items-center gap-3 pr-8">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Zap className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2
                id={titleId}
                className="text-title font-semibold text-on-surface"
              >
                {editing === "new"
                  ? "New quick reply"
                  : editing
                    ? "Edit quick reply"
                    : "Quick replies"}
              </h2>
              <p className="text-label text-on-surface-variant">
                Type{" "}
                <kbd className="rounded bg-surface-container px-1 font-mono">
                  /
                </kbd>{" "}
                in any chat to use one. Free, no AI.
              </p>
            </div>
          </div>
          <IconButton
            size="xs"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4"
          >
            <X className="h-4 w-4" />
          </IconButton>

          {editing ? (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="qr-title">Name</Label>
                <Input
                  id="qr-title"
                  value={form.title}
                  maxLength={100}
                  autoFocus
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g. Website price"
                />
              </div>
              <div>
                <Label htmlFor="qr-shortcut">
                  Shortcut{" "}
                  <span className="font-normal text-on-surface-variant">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="qr-shortcut"
                  value={form.shortcut}
                  maxLength={50}
                  leadingIcon={<span className="font-mono text-body">/</span>}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      shortcut: e.target.value.replace(/\s+/g, "-"),
                    }))
                  }
                  placeholder="price"
                  aria-describedby="qr-shortcut-hint"
                />
                <p
                  id="qr-shortcut-hint"
                  className="mt-1 text-caption text-on-surface-variant"
                >
                  Typing /{form.shortcut || "price"} brings this reply up first.
                </p>
              </div>
              <div>
                <Label htmlFor="qr-content">Message</Label>
                <textarea
                  id="qr-content"
                  value={form.content}
                  maxLength={4096}
                  rows={5}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, content: e.target.value }))
                  }
                  className="mt-1 w-full resize-y rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-lg text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {error && (
                <p className="text-label text-error" role="alert">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => (draft ? onClose() : setEditing(null))}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Save quick reply
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <SearchInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search quick replies"
                  aria-label="Search quick replies"
                  className="flex-1"
                />
                <Button onClick={startNew}>
                  <Plus className="h-4 w-4" aria-hidden />
                  New
                </Button>
              </div>

              {isLoading ? (
                <p className="py-6 text-center text-label text-on-surface-variant">
                  Loading…
                </p>
              ) : replies.length === 0 ? (
                <div className="rounded-xl border border-dashed border-outline-variant px-4 py-8 text-center">
                  <MessageSquareText
                    className="mx-auto h-6 w-6 text-on-surface-variant"
                    aria-hidden
                  />
                  <p className="mt-2 text-body font-medium text-on-surface">
                    No quick replies yet
                  </p>
                  <p className="mt-1 text-label text-on-surface-variant">
                    Save answers you send often, like prices, your address or
                    payment details.
                  </p>
                </div>
              ) : shown.length === 0 ? (
                <p className="py-6 text-center text-label text-on-surface-variant">
                  No quick reply matches “{search}”.
                </p>
              ) : (
                <ul className="divide-y divide-outline-variant/40 rounded-xl border border-outline-variant/60">
                  {shown.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-start gap-2 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-body font-medium text-on-surface">
                          <span className="truncate">{r.title}</span>
                          {r.shortcut && (
                            <span className="shrink-0 font-mono text-caption text-on-surface-variant">
                              /{r.shortcut}
                            </span>
                          )}
                        </p>
                        <p className="line-clamp-2 text-label text-on-surface-variant">
                          {r.content}
                        </p>
                      </div>
                      <IconButton
                        size="sm"
                        onClick={() => startEdit(r)}
                        aria-label={`Edit ${r.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        size="sm"
                        variant="danger"
                        onClick={() => setToDelete(r)}
                        aria-label={`Delete ${r.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      }

      <ConfirmDialog
        open={!!toDelete}
        title="Delete quick reply?"
        message={
          toDelete
            ? `“${toDelete.title}” will no longer show up when you type /.`
            : ""
        }
        confirmLabel="Delete"
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success("Quick reply deleted");
              setToDelete(null);
            },
            onError: (err) =>
              toast.error(errorText(err, "Couldn't delete. Try again.")),
          })
        }
      />
    </>
  );
}
