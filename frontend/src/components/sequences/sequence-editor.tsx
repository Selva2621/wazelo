"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { RewriteMenu } from "@/components/sequences/create-sequence-modal";
import { useSaveSequenceEdits, type SequenceEdits } from "@/hooks/use-sequences";
import type { CampaignSequence } from "@/lib/types/sequences";

const WAITS = [
  { label: "1 hour", value: 60 },
  { label: "4 hours", value: 240 },
  { label: "1 day", value: 1440 },
  { label: "2 days", value: 2880 },
  { label: "3 days", value: 4320 },
  { label: "7 days", value: 10080 },
];

const LABEL = "text-label font-medium text-on-surface";
const INPUT =
  "mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body text-on-surface placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

type DraftStep = { key: string; stepId?: string; name: string; messageBody: string; delayMinutes: number };

/**
 * In-place editor for a draft or paused sequence. Drafts can add/remove messages; paused
 * sequences can only change settings and existing messages (people part-way through are
 * tracked by message position). Saves only what changed.
 */
export function SequenceEditor({
  sequence,
  onDone,
}: {
  sequence: CampaignSequence;
  onDone: () => void;
}) {
  const isDraft = sequence.status === "DRAFT";
  const original = [...sequence.steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const [name, setName] = useState(sequence.name);
  const [description, setDescription] = useState(sequence.description ?? "");
  const [exitOnReply, setExitOnReply] = useState(sequence.exitOnReply);
  const [steps, setSteps] = useState<DraftStep[]>(
    original.map((s) => ({
      key: s.id,
      stepId: s.id,
      name: s.name ?? "",
      messageBody: s.messageBody ?? "",
      delayMinutes: s.delayMinutes,
    })),
  );
  const newKey = useRef(0);
  const save = useSaveSequenceEdits(sequence.id);

  const update = (key: string, patch: Partial<DraftStep>) =>
    setSteps((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const problem = !name.trim()
    ? "Give the sequence a name"
    : steps.length === 0
      ? "Keep at least one message"
      : (() => {
          const empty = steps.findIndex((s) => !s.messageBody.trim());
          return empty >= 0 ? `Write message ${empty + 1}` : null;
        })();

  const buildEdits = (): SequenceEdits => {
    const settings: SequenceEdits["settings"] = {};
    if (name.trim() !== sequence.name) settings.name = name.trim();
    if (description.trim() !== (sequence.description ?? "")) settings.description = description.trim();
    if (exitOnReply !== sequence.exitOnReply) settings.exitOnReply = exitOnReply;

    const updated: SequenceEdits["updated"] = [];
    for (const s of steps.filter((s) => s.stepId)) {
      const before = original.find((o) => o.id === s.stepId)!;
      const fields: SequenceEdits["updated"][number] = { stepId: s.stepId! };
      if (s.name.trim() !== (before.name ?? "")) fields.name = s.name.trim();
      if (s.messageBody !== (before.messageBody ?? "")) fields.messageBody = s.messageBody;
      // The API keeps a 1-minute minimum; a first message with no wait is never re-sent
      if (s.delayMinutes !== before.delayMinutes && s.delayMinutes >= 1) fields.delayMinutes = s.delayMinutes;
      if (Object.keys(fields).length > 1) updated.push(fields);
    }

    const kept = new Set(steps.map((s) => s.stepId).filter(Boolean));
    const removed = isDraft ? original.filter((o) => !kept.has(o.id)).map((o) => o.id) : [];
    const lastOrder = Math.max(-1, ...original.map((o) => o.stepOrder));
    const added = isDraft
      ? steps
          .filter((s) => !s.stepId)
          .map((s, i) => ({
            stepOrder: lastOrder + 1 + i,
            name: s.name.trim() || undefined,
            messageBody: s.messageBody,
            delayMinutes: Math.max(1, s.delayMinutes),
          }))
      : [];
    return { settings, updated, removed, added };
  };

  const onSave = () => {
    if (problem || save.isPending) return;
    save.mutate(buildEdits(), { onSuccess: onDone });
  };

  return (
    <div className="space-y-6">
      {!isDraft && (
        <p role="note" className="rounded-xl bg-warning-container px-4 py-3 text-label text-warning">
          This sequence is paused. You can change its settings and message text; contacts already in it get the new
          text for messages they haven&apos;t received yet. Adding or removing messages is only possible on drafts.
        </p>
      )}

      <section aria-labelledby="edit-settings-title" className="space-y-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
        <h2 id="edit-settings-title" className="text-title-sm font-semibold text-on-surface">Settings</h2>
        <div>
          <label htmlFor="edit-name" className={LABEL}>
            Name <span aria-hidden className="text-error">*</span>
          </label>
          <input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} required className={INPUT} />
        </div>
        <div>
          <label htmlFor="edit-description" className={LABEL}>Description</label>
          <textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={cn(INPUT, "resize-none")}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={exitOnReply}
            onChange={(e) => setExitOnReply(e.target.checked)}
            className="size-4 rounded border-outline-variant accent-primary"
          />
          <span className="text-body text-on-surface">Stop when the contact replies</span>
        </label>
      </section>

      <section aria-labelledby="edit-messages-title" className="space-y-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
        <h2 id="edit-messages-title" className="text-title-sm font-semibold text-on-surface">
          Messages <span className="font-normal text-on-surface-variant tabular-nums">{steps.length}</span>
        </h2>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.key} className="rounded-xl border border-outline-variant p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-caption font-semibold tabular-nums text-primary">
                  {i + 1}
                </span>
                <input
                  value={s.name}
                  onChange={(e) => update(s.key, { name: e.target.value })}
                  placeholder={`Message ${i + 1} name (optional)`}
                  aria-label={`Message ${i + 1} name`}
                  className="min-w-0 flex-1 rounded-lg bg-transparent px-1.5 py-0.5 text-label font-medium text-on-surface placeholder:font-normal placeholder:text-placeholder outline-none focus-visible:ring-2 focus-visible:ring-focus"
                />
                {(i > 0 || sequence.triggerType) && (
                  <label className="flex items-center gap-1.5 text-caption text-on-surface-variant">
                    {i === 0 ? "After the trigger, wait" : "Wait"}
                    <select
                      value={s.delayMinutes}
                      onChange={(e) => update(s.key, { delayMinutes: parseInt(e.target.value) })}
                      className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1 text-caption text-on-surface focus:border-primary focus:outline-none"
                    >
                      {(WAITS.some((w) => w.value === s.delayMinutes) ? WAITS : [{ label: `${s.delayMinutes} min`, value: s.delayMinutes }, ...WAITS]).map((w) => (
                        <option key={w.value} value={w.value}>{w.label}</option>
                      ))}
                    </select>
                  </label>
                )}
                {isDraft && steps.length > 1 && (
                  <IconButton
                    size="xs"
                    variant="danger"
                    onClick={() => setSteps((list) => list.filter((x) => x.key !== s.key))}
                    aria-label={`Remove message ${i + 1}`}
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                )}
              </div>
              <textarea
                value={s.messageBody}
                onChange={(e) => update(s.key, { messageBody: e.target.value })}
                aria-label={`Message ${i + 1} text`}
                rows={3}
                maxLength={4096}
                className={cn(INPUT, "mt-0 resize-y")}
              />
              <div className="mt-2">
                <RewriteMenu
                  message={s.messageBody}
                  goal={description || name}
                  onRewrite={(next) => update(s.key, { messageBody: next })}
                />
              </div>
            </li>
          ))}
        </ol>
        {isDraft && (
          <button
            type="button"
            onClick={() =>
              setSteps((list) => [...list, { key: `new-${newKey.current++}`, name: "", messageBody: "", delayMinutes: 1440 }])
            }
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-outline-variant py-2.5 text-label font-medium text-primary outline-none transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Plus className="h-3.5 w-3.5" /> Add message
          </button>
        )}
      </section>

      {/* Sticky save bar so Save is always in reach on long sequences */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest/95 px-4 py-3 shadow-popover backdrop-blur">
        {problem && (
          <p role="status" className="mr-auto text-label text-warning">{problem}</p>
        )}
        <Button variant="ghost" onClick={onDone} disabled={save.isPending}>Cancel</Button>
        <Button onClick={onSave} disabled={!!problem} loading={save.isPending}>Save changes</Button>
      </div>
    </div>
  );
}
