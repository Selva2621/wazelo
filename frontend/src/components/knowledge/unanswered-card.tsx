"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useAnswerUnanswered, useDismissUnanswered, useKbUnanswered } from "@/hooks/use-knowledge-base";
import type { KbUnanswered } from "@/lib/api/knowledge-base";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body text-on-surface placeholder:text-placeholder outline-none hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/30";

function errorMessage(err: unknown, fallback: string): string {
  return (err as { message?: string })?.message || fallback;
}

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function Row({ item }: { item: KbUnanswered }) {
  const answer = useAnswerUnanswered();
  const dismiss = useDismissUnanswered();
  const [draft, setDraft] = useState<{ question: string; answer: string } | null>(null);

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-body text-on-surface">{item.question}</p>
          <p className="text-label text-on-surface-variant">
            {item.count > 1 ? `Asked ${item.count}×` : "Asked once"} · {item.channel === "WIDGET" ? "Website chat" : "WhatsApp"} ·{" "}
            {ago(item.lastAskedAt)}
          </p>
        </div>
        {!draft && (
          <Button size="sm" variant="secondary" onClick={() => setDraft({ question: item.question.slice(0, 200), answer: "" })}>
            Answer
          </Button>
        )}
        <IconButton
          aria-label={`Dismiss “${item.question}”`}
          title="Dismiss"
          disabled={dismiss.isPending}
          onClick={() => dismiss.mutate(item.id, { onError: (err) => toast.error(errorMessage(err, "Couldn't dismiss")) })}
        >
          <X className="h-4 w-4" />
        </IconButton>
      </div>

      {draft && (
        <div className="mt-2 space-y-1.5">
          <Input
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value.slice(0, 200) })}
            aria-label="Question as it will appear in your FAQs"
          />
          <textarea
            value={draft.answer}
            onChange={(e) => setDraft({ ...draft, answer: e.target.value.slice(0, 1000) })}
            aria-label="Your answer"
            placeholder="Your answer. The bot will use it next time."
            rows={3}
            autoFocus
            className={cn(field, "resize-y")}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!draft.question.trim() || !draft.answer.trim()}
              loading={answer.isPending}
              onClick={() =>
                answer.mutate(
                  { id: item.id, question: draft.question.trim(), answer: draft.answer.trim() },
                  {
                    onSuccess: () => toast.success("Added to your FAQs"),
                    onError: (err) => toast.error(errorMessage(err, "Couldn't save")),
                  },
                )
              }
            >
              Add to FAQs
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Questions the bot couldn't answer, most asked first; answering one makes it a FAQ. */
export function UnansweredCard({ className }: { className?: string }) {
  const { data } = useKbUnanswered();
  const total = data?.total ?? 0;

  return (
    <section aria-labelledby="unanswered-heading" className={cn("space-y-1 p-5", className)}>
      <div className="flex items-center gap-2">
        <h2 id="unanswered-heading" className="text-body-lg font-medium text-on-surface">
          Unanswered questions
        </h2>
        {total > 0 && <Badge variant="warning">{total}</Badge>}
      </div>
      {total === 0 ? (
        <p className="text-label text-on-surface-variant">None yet. Questions the bot can&apos;t answer will show up here.</p>
      ) : (
        <>
          <p className="text-label text-on-surface-variant">Answer them once and the bot will know next time.</p>
          <ul className="divide-y divide-outline-variant">
            {data!.items.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
