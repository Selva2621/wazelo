"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Globe, RefreshCw, Send, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/use-page-title";
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
import { Switch } from "@/components/ui/switch";
import { UnansweredCard } from "@/components/knowledge/unanswered-card";
import { HandoverCard } from "@/components/knowledge/handover-card";
import { useAiMemory, useUpdateAiMemory } from "@/hooks/use-settings";
import { useAiCredits } from "@/hooks/use-ai-credits";
import { aiApi } from "@/lib/api/ai";
import type { KbWebsiteSource } from "@/lib/api/knowledge-base";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { FaqsCard } from "@/components/knowledge/faqs-card";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { PageHeader } from "@/components/layout/page-header";

const card = "rounded-2xl border border-outline-variant bg-surface-container-lowest";
const sectionTitle = "text-body-lg font-medium text-on-surface";
const hint = "text-label text-on-surface-variant";

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { message?: string };
  return e?.message || fallback;
}

function costOf(costs: { action: string; cost: number }[] | undefined, action: string, fallback: number) {
  if (!costs) return fallback;
  return costs.find((c) => c.action === action)?.cost ?? 0;
}

const credits = (n: number) => (n === 0 ? "free" : `${n} credit${n === 1 ? "" : "s"}`);

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

function WebsitesCard({ buildCost }: { buildCost: number }) {
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
    <section aria-labelledby="websites-heading" className={cn(card, "p-5 space-y-3")}>
      <div>
        <h2 id="websites-heading" className={sectionTitle}>Website</h2>
        <p className={hint}>The bot reads up to 30 pages: services, prices, FAQs, policies.</p>
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

function FilesCard() {
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
    <section aria-labelledby="files-heading" className={cn(card, "p-5 space-y-3")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="files-heading" className={sectionTitle}>Files</h2>
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

/* ─── Instructions ─── */

function InstructionsCard() {
  const { data: memory, isLoading } = useAiMemory();
  const save = useUpdateAiMemory();
  const [text, setText] = useState<string | null>(null);
  const value = text ?? memory?.customContext ?? "";
  const dirty = text !== null && text !== (memory?.customContext ?? "");

  return (
    <section aria-labelledby="instructions-heading" className={cn(card, "p-5 space-y-3")}>
      <div>
        <h2 id="instructions-heading" className={sectionTitle}>Instructions</h2>
        <p className={hint}>How the bot should talk and what it should know that isn&apos;t on your website.</p>
      </div>
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
                  toast.success("Instructions saved");
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

/* ─── Test chat ─── */

interface ChatTurn {
  id: number;
  role: "you" | "bot";
  text: string;
  sources?: { title: string; url?: string | null }[];
  missed?: boolean;
}

function TestChat({ askCost }: { askCost: number }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, asking]);

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 2 || asking) return;
    setQuestion("");
    setTurns((t) => [...t, { id: Date.now(), role: "you", text: q }]);
    setAsking(true);
    try {
      const r = await aiApi.kbSearch(q);
      setTurns((t) => [
        ...t,
        r.answer
          ? { id: Date.now() + 1, role: "bot", text: r.answer, sources: r.sources }
          : {
              id: Date.now() + 1,
              role: "bot",
              missed: true,
              text: "Not in your knowledge yet — on WhatsApp the bot would say a team member will reply. Add it to your website, a file or the instructions.",
            },
      ]);
    } catch (err) {
      setTurns((t) => [...t, { id: Date.now() + 1, role: "bot", missed: true, text: errorMessage(err, "Couldn't get an answer") }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <aside id="test-bot" aria-labelledby="test-heading" className={cn(card, "max-lg:scroll-mt-4 flex h-[calc(100dvh-10rem)] min-h-[420px] flex-col overflow-hidden lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:h-[calc(100dvh-var(--header-height)-2rem)]")}>
      <div className="border-b border-outline-variant px-5 py-4">
        <h2 id="test-heading" className={cn(sectionTitle, "flex items-center gap-2")}>
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Test your bot
        </h2>
        <p className={hint}>Ask what customers ask. Each question uses {credits(askCost)}.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
        {turns.length === 0 && !asking && (
          <p className="pt-8 text-center text-body text-on-surface-variant">
            Try &ldquo;What are your prices?&rdquo; or &ldquo;Do you deliver?&rdquo;
          </p>
        )}
        {turns.map((t) => (
          <div key={t.id} className={cn("flex", t.role === "you" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-body",
                t.role === "you" && "rounded-br-sm bg-primary text-on-primary",
                t.role === "bot" && !t.missed && "rounded-bl-sm bg-surface-container-high text-on-surface",
                t.missed && "rounded-bl-sm border border-dashed border-outline text-on-surface-variant",
              )}
            >
              <p className="whitespace-pre-wrap">{t.text}</p>
              {t.sources && t.sources.length > 0 && (
                <p className="mt-1.5 flex flex-wrap gap-x-2 text-label text-on-surface-variant">
                  {t.sources.map((s, i) =>
                    s.url ? (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                        {s.title.split("|")[0].trim()}
                      </a>
                    ) : (
                      <span key={i}>{s.title.split("|")[0].trim()}</span>
                    ),
                  )}
                </p>
              )}
            </div>
          </div>
        ))}
        {asking && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-surface-container-high px-3.5 py-2.5"><Spinner size="sm" /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={ask} className="flex gap-2 border-t border-outline-variant p-3">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something…"
          aria-label="Test question"
          maxLength={500}
        />
        <Button type="submit" aria-label="Ask" disabled={question.trim().length < 2 || asking} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </aside>
  );
}

export default function ChatbotKnowledgePage() {
  usePageTitle("Bot knowledge");
  const { data: creditsData } = useAiCredits();
  const buildCost = costOf(creditsData?.costs, "kb_build", 10);
  const askCost = costOf(creditsData?.costs, "kb_search", 1);
  const faqCost = costOf(creditsData?.costs, "faq_generate", 3);

  return (
    // No overflow wrapper here: the window scrolls, so the test chat can stick beside the cards
    <div>
      {/* Mobile: the test chat sits below a long list, so offer a jump to it */}
      <MobilePageActions
        more={[{ label: "Test your bot", onSelect: () => document.getElementById("test-bot")?.scrollIntoView({ behavior: "smooth" }) }]}
      />
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <div className="space-y-1">
          <Link href="/chatbot" className="inline-flex items-center gap-1 rounded-md text-label text-on-surface-variant outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus max-lg:hidden">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Chatbot
          </Link>
          <PageHeader
            className="max-lg:hidden"
            title="Bot knowledge"
            description={<>What your bot answers from. Turn on &ldquo;Use knowledge base&rdquo; in a flow to use it.</>}
          />
          {/* Phones/tablets: the nav bar has the title */}
          <p className="text-body text-on-surface-variant lg:hidden">
            What your bot answers from. Turn on &ldquo;Use knowledge base&rdquo; in a flow to use it.
          </p>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-5">
            <WebsitesCard buildCost={buildCost} />
            <UnansweredCard className={card} />
            <FaqsCard suggestCost={faqCost} className={card} />
            <FilesCard />
            <InstructionsCard />
            <HandoverCard className={card} />
          </div>
          <TestChat askCost={askCost} />
        </div>
      </div>
    </div>
  );
}
