"use client";

import { useState } from "react";
import { Pencil, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useDeleteArticle,
  useKbFaqs,
  usePublishFaqs,
  useSuggestFaqs,
  useUpdateArticle,
} from "@/hooks/use-knowledge-base";
import type { FaqSuggestion, KbFaq } from "@/lib/api/knowledge-base";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const MAX_QUESTION = 200;
const MAX_ANSWER = 1000;

const field =
  "w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body text-on-surface placeholder:text-placeholder outline-none hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/30";

function errorMessage(err: unknown, fallback: string): string {
  return (err as { message?: string })?.message || fallback;
}

const credits = (n: number) => (n === 0 ? "free" : `${n} credit${n === 1 ? "" : "s"}`);

interface Draft extends FaqSuggestion {
  key: number;
  picked: boolean;
}

/* One suggestion: tick to include, edit before publishing */
function SuggestionRow({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const id = `faq-draft-${draft.key}`;
  return (
    <li className={cn("flex gap-3 py-3", !draft.picked && "opacity-60")}>
      <input
        id={id}
        type="checkbox"
        checked={draft.picked}
        onChange={(e) => onChange({ ...draft, picked: e.target.checked })}
        className="mt-2.5 h-4 w-4 shrink-0 accent-primary"
        aria-label={`Include “${draft.question}”`}
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Input
          value={draft.question}
          onChange={(e) => onChange({ ...draft, question: e.target.value.slice(0, MAX_QUESTION) })}
          aria-label="Question"
          className="font-medium"
        />
        <textarea
          value={draft.answer}
          onChange={(e) => onChange({ ...draft, answer: e.target.value.slice(0, MAX_ANSWER) })}
          aria-label="Answer"
          rows={2}
          className={cn(field, "resize-y")}
        />
      </div>
    </li>
  );
}

/* A published FAQ: read view, inline edit, remove */
function FaqRow({ faq }: { faq: KbFaq }) {
  const update = useUpdateArticle();
  const remove = useDeleteArticle();
  const [edit, setEdit] = useState<{ question: string; answer: string } | null>(null);

  if (edit) {
    const valid = edit.question.trim() && edit.answer.trim();
    return (
      <li className="space-y-1.5 py-3">
        <Input
          value={edit.question}
          onChange={(e) => setEdit({ ...edit, question: e.target.value.slice(0, MAX_QUESTION) })}
          aria-label="Question"
          className="font-medium"
          autoFocus
        />
        <textarea
          value={edit.answer}
          onChange={(e) => setEdit({ ...edit, answer: e.target.value.slice(0, MAX_ANSWER) })}
          aria-label="Answer"
          rows={3}
          className={cn(field, "resize-y")}
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!valid}
            loading={update.isPending}
            onClick={() =>
              update.mutate(
                { id: faq.id, title: edit.question.trim(), body: edit.answer.trim() },
                {
                  onSuccess: () => setEdit(null),
                  onError: (err) => toast.error(errorMessage(err, "Couldn't save")),
                },
              )
            }
          >
            Save
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-on-surface">{faq.title}</p>
        <p className="line-clamp-2 text-body text-on-surface-variant">{faq.body}</p>
      </div>
      <IconButton aria-label={`Edit “${faq.title}”`} onClick={() => setEdit({ question: faq.title, answer: faq.body })}>
        <Pencil className="h-4 w-4" />
      </IconButton>
      <IconButton
        aria-label={`Remove “${faq.title}”`}
        disabled={remove.isPending}
        onClick={() => remove.mutate(faq.id, { onError: (err) => toast.error(errorMessage(err, "Couldn't remove")) })}
      >
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </li>
  );
}

export function FaqsCard({ suggestCost, className }: { suggestCost: number; className?: string }) {
  const { data: faqs, isLoading } = useKbFaqs();
  const suggest = useSuggestFaqs();
  const publish = usePublishFaqs();
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const picked = drafts.filter((d) => d.picked && d.question.trim() && d.answer.trim());

  const runSuggest = () =>
    suggest.mutate(undefined, {
      onSuccess: ({ suggestions }) => {
        if (!suggestions.length) {
          toast.info("No new questions found. Your FAQs already cover your content.");
          return;
        }
        setDrafts(suggestions.map((s, i) => ({ ...s, key: Date.now() + i, picked: true })));
      },
      onError: (err) => toast.error(errorMessage(err, "Couldn't suggest FAQs")),
    });

  const runPublish = () =>
    publish.mutate(
      picked.map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() })),
      {
        onSuccess: ({ published }) => {
          toast.success(`${published} FAQ${published === 1 ? "" : "s"} published`);
          setDrafts([]);
        },
        onError: (err) => toast.error(errorMessage(err, "Couldn't publish")),
      },
    );

  return (
    <section aria-labelledby="faqs-heading" className={cn("space-y-3 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="faqs-heading" className="text-body-lg font-medium text-on-surface">
            FAQs
          </h2>
          <p className="text-label text-on-surface-variant">Common questions, answered from your website and files.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={runSuggest}
          loading={suggest.isPending}
          disabled={publish.isPending}
          className="shrink-0"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Suggest · {credits(suggestCost)}
        </Button>
      </div>

      {suggest.isPending && (
        <p className="flex items-center gap-2 text-label text-on-surface-variant" role="status">
          <Spinner size="sm" /> Reading your content…
        </p>
      )}

      {drafts.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4">
          <ul className="divide-y divide-outline-variant">
            {drafts.map((d) => (
              <SuggestionRow
                key={d.key}
                draft={d}
                onChange={(next) => setDrafts((all) => all.map((x) => (x.key === next.key ? next : x)))}
              />
            ))}
          </ul>
          <div className="flex items-center justify-end gap-2 border-t border-outline-variant py-3">
            <Button size="sm" variant="ghost" onClick={() => setDrafts([])} disabled={publish.isPending}>
              Discard
            </Button>
            <Button size="sm" onClick={runPublish} loading={publish.isPending} disabled={!picked.length}>
              Publish {picked.length}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-3">
          <Spinner size="sm" />
        </div>
      ) : faqs && faqs.length > 0 ? (
        <ul className="divide-y divide-outline-variant">
          {faqs.map((f) => (
            <FaqRow key={f.id} faq={f} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
