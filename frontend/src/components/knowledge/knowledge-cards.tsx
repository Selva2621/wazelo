"use client";

import { useRef, useState, type FormEvent } from "react";
import { FileText, Globe, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  useAddWebsite,
  useDeleteDocument,
  useKbDocuments,
  useKbWebsites,
  useRemoveWebsite,
  useResyncWebsite,
  useSetWebsiteAutoResync,
  useUploadDocument,
} from "@/hooks/use-knowledge-base";
import { useAiMemory, useUpdateAiMemory } from "@/hooks/use-settings";
import type { KbWebsiteSource } from "@/lib/api/knowledge-base";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * The business knowledge every AI feature uses (chatbot, website chat,
 * sequences, campaigns, automation, proposals, templates). Shared by
 * Settings → Business Knowledge and Chatbot → Knowledge so both edit the same data.
 */

export const knowledgeCard = "rounded-2xl border border-outline-variant bg-surface-container-lowest";
const sectionTitle = "text-body-lg font-medium text-on-surface";
const hint = "text-label text-on-surface-variant";

export function errorMessage(err: unknown, fallback: string): string {
  const e = err as { message?: string };
  return e?.message || fallback;
}

export function costOf(costs: { action: string; cost: number }[] | undefined, action: string, fallback: number) {
  if (!costs) return fallback;
  return costs.find((c) => c.action === action)?.cost ?? 0;
}

export const credits = (n: number) => (n === 0 ? "free" : `${n} credit${n === 1 ? "" : "s"}`);

/* ─── Websites ─── */

function statusBadge(s: KbWebsiteSource) {
  if (s.status === "READY") return <Badge variant="success" dot>{s.pages} pages</Badge>;
  if (s.status === "FAILED") return <Badge variant="error" dot>Failed</Badge>;
  if (s.status === "QUEUED") return <Badge variant="muted" dot>Queued</Badge>;
  return <Badge variant="info" dot pulse>Reading…</Badge>;
}

function WebsiteRow({ source, buildCost }: { source: KbWebsiteSource; buildCost: number }) {
  const resync = useResyncWebsite();
  const remove = useRemoveWebsite();
  const autoResync = useSetWebsiteAutoResync();
  const busy = source.status === "QUEUED" || source.status === "CRAWLING";
  const pct = source.pagesFound > 0 ? Math.round((source.pagesDone / source.pagesFound) * 100) : 0;

  return (
    <li className="space-y-2 py-3">
      <div className="flex items-center gap-3">
        <Globe className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate text-body text-on-surface hover:text-primary hover:underline"
        >
          {source.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </a>
        {statusBadge(source)}
        <IconButton
          aria-label={`Read ${source.url} again`}
          title="Read again"
          disabled={busy || resync.isPending}
          onClick={() =>
            resync.mutate(source.id, {
              onSuccess: () => toast.success("Reading the website again"),
              onError: (err) => toast.error(errorMessage(err, "Couldn't start")),
            })
          }
        >
          <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
        </IconButton>
        <IconButton
          aria-label={`Remove ${source.url}`}
          title="Remove"
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(source.id, {
              onSuccess: () => toast.success("Website removed"),
              onError: (err) => toast.error(errorMessage(err, "Couldn't remove")),
            })
          }
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
      {busy && (
        <div className="pl-7">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Pages read">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(pct, 5)}%` }} />
          </div>
          <p className={cn(hint, "mt-1")}>
            {source.pagesFound ? `Read ${source.pagesDone} of ${source.pagesFound} pages` : "Starting…"}
          </p>
        </div>
      )}
      {source.status === "FAILED" && source.error && <p className="pl-7 text-label text-error">{source.error}</p>}
      {!busy && (
        <div className="flex flex-wrap items-center justify-between gap-2 pl-7">
          <p className={hint}>
            {source.lastSyncedAt
              ? `Updated ${new Date(source.lastSyncedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`
              : ""}
          </p>
          <label className={cn(hint, "flex items-center gap-2")}>
            Re-read weekly · {credits(buildCost)}
            <Switch
              aria-label={`Re-read ${source.url} every week`}
              checked={source.autoResync}
              disabled={autoResync.isPending}
              onChange={(on) =>
                autoResync.mutate(
                  { id: source.id, autoResync: on },
                  { onError: (err) => toast.error(errorMessage(err, "Couldn't change it")) },
                )
              }
            />
          </label>
        </div>
      )}
    </li>
  );
}

export function WebsitesCard({ buildCost, title = "Website", className }: { buildCost: number; title?: string; className?: string }) {
  const { data: sources, isLoading } = useKbWebsites();
  const add = useAddWebsite();
  const [url, setUrl] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    add.mutate(url.trim(), {
      onSuccess: () => {
        toast.success("Reading your website — this takes about a minute");
        setUrl("");
      },
      onError: (err) => toast.error(errorMessage(err, "Couldn't add the website")),
    });
  };

  return (
    <section aria-labelledby="websites-heading" className={cn(knowledgeCard, "p-5 space-y-3", className)}>
      <div>
        <h2 id="websites-heading" className={sectionTitle}>{title}</h2>
        <p className={hint}>The AI reads up to 30 pages: services, prices, FAQs, policies.</p>
      </div>
      <form onSubmit={submit} className="flex gap-2" noValidate>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourbusiness.com"
          aria-label="Website address"
          autoComplete="url"
          inputMode="url"
        />
        <Button type="submit" loading={add.isPending} disabled={!url.trim()} className="shrink-0">
          Learn · {credits(buildCost)}
        </Button>
      </form>
      {isLoading ? (
        <div className="flex justify-center py-3"><Spinner size="sm" /></div>
      ) : sources && sources.length > 0 ? (
        <ul className="divide-y divide-outline-variant">
          {sources.map((s) => <WebsiteRow key={s.id} source={s} buildCost={buildCost} />)}
        </ul>
      ) : null}
    </section>
  );
}

/* ─── Files ─── */

export function FilesCard({ title = "Files", className }: { title?: string; className?: string }) {
  const { data: docs, isLoading } = useKbDocuments();
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const files = (docs ?? []).filter((d) => (d.sourceType ?? "UPLOAD") !== "WEBSITE" && !d.flowId);

  const onPick = (file: File | undefined) => {
    if (!file) return;
    upload.mutate(
      { file },
      {
        onSuccess: () => toast.success(`${file.name} added`),
        onError: (err) => toast.error(errorMessage(err, "Upload failed")),
      },
    );
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section aria-labelledby="files-heading" className={cn(knowledgeCard, "p-5 space-y-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="files-heading" className={sectionTitle}>{title}</h2>
          <p className={hint}>Price lists, menus, brochures — PDF, TXT, CSV or Markdown, up to 20 MB.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} loading={upload.isPending}>
          <Upload className="h-4 w-4" aria-hidden />
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.csv,.md,application/pdf,text/plain,text/csv,text/markdown"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-3"><Spinner size="sm" /></div>
      ) : files.length > 0 ? (
        <ul className="divide-y divide-outline-variant">
          {files.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-body text-on-surface">{d.title}</span>
              {d.status === "READY" ? <Badge variant="success" dot>Ready</Badge> : d.status === "FAILED" ? <Badge variant="error" dot>Failed</Badge> : <Badge variant="muted" dot>Processing</Badge>}
              <IconButton
                aria-label={`Remove ${d.title}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate(d.id, { onError: (err) => toast.error(errorMessage(err, "Couldn't remove")) })}
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/* ─── Instructions / rules ─── */

export function InstructionsCard({
  title = "Instructions",
  description = "How the bot should talk and what it should know that isn't on your website.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  const { data: memory, isLoading } = useAiMemory();
  const save = useUpdateAiMemory();
  const [text, setText] = useState<string | null>(null);
  const value = text ?? memory?.customContext ?? "";
  const dirty = text !== null && text !== (memory?.customContext ?? "");

  return (
    <section aria-labelledby="instructions-heading" className={cn(knowledgeCard, "p-5 space-y-3", className)}>
      <div>
        <h2 id="instructions-heading" className={sectionTitle}>{title}</h2>
        <p className={hint}>{description}</p>
      </div>
      {/* The bot that answers customers reads this too, so it can repeat it */}
      <p role="note" className="rounded-lg bg-warning-container px-3 py-2 text-label text-warning">
        Customers&apos; bots read this too — don&apos;t put private numbers here (costs, margins, passwords).
      </p>
      <textarea
        aria-labelledby="instructions-heading"
        value={value}
        disabled={isLoading}
        onChange={(e) => setText(e.target.value.slice(0, 2000))}
        rows={5}
        placeholder={"Friendly and short. Reply in Tamil or English, as the customer writes.\nWe're open 9am–8pm, Monday to Saturday.\nIf you're not sure, say a team member will reply soon."}
        className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body text-on-surface placeholder:text-placeholder outline-none hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex items-center justify-between gap-3">
        <span className={hint}>{value.length} / 2000</span>
        <Button
          size="sm"
          disabled={!dirty}
          loading={save.isPending}
          onClick={() =>
            save.mutate(
              { customContext: value.trim() },
              {
                onSuccess: () => {
                  toast.success("Saved");
                  setText(null);
                },
                onError: (err) => toast.error(errorMessage(err, "Couldn't save")),
              },
            )
          }
        >
          Save
        </Button>
      </div>
    </section>
  );
}
