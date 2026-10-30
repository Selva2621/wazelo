"use client";

import { useId, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  BookOpen,
  BookmarkPlus,
  Check,
  ChevronDown,
  Frown,
  Meh,
  MessageSquareText,
  RefreshCw,
  Smile,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiCredits } from "@/hooks/use-ai-credits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  useChatRead,
  useReadChat,
  useSaveTagsToContact,
  useSuggestReplies,
} from "@/hooks/use-ai";
import { useKbFaqs } from "@/hooks/use-knowledge-base";
import {
  QuickReplyManager,
  type QuickReplyDraft,
} from "@/components/chat/quick-reply-manager";
import { rankByWords } from "@/lib/text-match";
import type { ReplyTone } from "@/lib/types/ai";

interface AiInsightPanelProps {
  conversationId: string | null;
  /** Puts a suggested reply into the message box */
  onSelectReply: (text: string) => void;
  /** The customer's latest message: the starting search for the free FAQ lookup */
  lastCustomerMessage?: string;
}

/** Mood in everyday words */
const MOOD = {
  POSITIVE: { icon: Smile, color: "text-success", label: "Happy" },
  NEUTRAL: { icon: Meh, color: "text-on-surface-variant", label: "Calm" },
  NEGATIVE: { icon: Frown, color: "text-warning", label: "Unhappy" },
  URGENT: { icon: AlertTriangle, color: "text-error", label: "Needs help now" },
} as const;

/** What the customer is after */
const WANTS: Record<string, string> = {
  purchase: "To buy something",
  support: "Help with a problem",
  complaint: "To make a complaint",
  billing: "Help with a bill or payment",
  appointment: "To book a time",
  information: "Information",
  feedback: "To give feedback",
  cancellation: "To cancel",
  referral: "To refer someone",
  spam: "Looks like spam",
  other: "Something else",
};

const NEXT_STEP: Record<string, string> = {
  assign_to_sales: "Pass to sales",
  assign_to_support: "Pass to support",
  create_ticket: "Open a support ticket",
  send_catalog: "Send your catalog",
  schedule_callback: "Call them back",
  escalate: "Pass to a manager",
  send_invoice: "Send an invoice",
};

const PRIORITY = {
  URGENT: { variant: "error", label: "Urgent" },
  HIGH: { variant: "warning", label: "High" },
  MEDIUM: { variant: "info", label: "Medium" },
  LOW: { variant: "muted", label: "Low" },
} as const;

const TONES: { value: ReplyTone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "short", label: "Short" },
];

const credits = (n: number) =>
  n === 0 ? "free" : `${n} credit${n === 1 ? "" : "s"}`;

function languageName(code: string) {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "language" }).of(code) ??
      code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}

function sentence(text: string) {
  const t = text.replace(/_/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}

function errorText(err: unknown, fallback: string) {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  return (Array.isArray(msg) ? msg[0] : msg) || fallback;
}

/** One labelled line: "Mood    Calm · asked politely about price" */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-1">
      <dt className="text-caption font-medium text-on-surface-variant">
        {label}
      </dt>
      <dd className="min-w-0 text-label text-on-surface">{children}</dd>
    </div>
  );
}

interface ReplySet {
  replies: string[];
  sources: string[];
}

/**
 * "About this chat": one AI read of the conversation in plain labelled rows, plus
 * the two AI helpers (suggest a reply, find an answer in the org's knowledge).
 * Credits are spent only on a click that says its cost; a read is kept (free to
 * look at again) until the customer writes something new.
 */
export function AiInsightPanel({
  conversationId,
  onSelectReply,
  lastCustomerMessage = "",
}: AiInsightPanelProps) {
  const bodyId = useId();
  const titleId = useId();
  const goalId = useId();
  const replyRegionId = useId();
  // Open on desktop; collapsed on phones so the chat keeps its room
  const [expanded, setExpanded] = useState(
    () =>
      typeof window === "undefined" ||
      window.matchMedia("(min-width: 1024px)").matches,
  );
  // Free FAQ search: open per chat, with its own editable search text
  const [faqFor, setFaqFor] = useState<string | null>(null);
  const [faqQueries, setFaqQueries] = useState<Record<string, string>>({});
  const faqInputId = useId();
  const [quickDraft, setQuickDraft] = useState<QuickReplyDraft | null>(null);

  // Reply suggestions: the tone is a preference kept across chats; the instruction and results are per chat
  const [tone, setTone] = useState<ReplyTone>("friendly");
  const [goals, setGoals] = useState<Record<string, string>>({});
  const [replySets, setReplySets] = useState<
    Record<string, ReplySet & { tone: ReplyTone; goal: string }>
  >({});
  const [repliesOpenFor, setRepliesOpenFor] = useState<string | null>(null);
  const suggest = useSuggestReplies();

  const saved = useChatRead(conversationId);
  const read = useReadChat();
  const faqOpen = !!conversationId && faqFor === conversationId;
  // The FAQ list is ordinary data (no AI), loaded only once the search is opened
  const faqs = useKbFaqs({ enabled: faqOpen });
  const saveTags = useSaveTagsToContact();

  const { data: wallet } = useAiCredits();
  const costOf = (action: string, fallback = 1) =>
    wallet
      ? (wallet.costs.find((c) => c.action === action)?.cost ?? 0)
      : fallback;
  const readCost = credits(costOf("read_chat"));
  const replyCost = credits(costOf("smart_reply"));

  if (!conversationId) return null;
  const chatId = conversationId;

  /* ── Read-out ── */
  const state = saved.data;
  const reading = read.isPending && read.variables === chatId;
  const readError =
    read.isError && read.variables === chatId
      ? errorText(read.error, "Couldn't read this chat. Try again.")
      : null;
  const ready = state?.status === "ready" ? state : null;
  const r = ready?.readout;
  const stale = !!ready && !ready.upToDate;
  const mood = r ? (MOOD[r.mood] ?? MOOD.NEUTRAL) : null;
  const nextStep = r ? NEXT_STEP[r.nextStep] : undefined;
  const mentioned = r ? Object.entries(r.mentioned) : [];
  const priority = r ? (PRIORITY[r.priority] ?? PRIORITY.MEDIUM) : null;
  const tagsFor = saveTags.variables?.conversationId === chatId;
  const savingTags = saveTags.isPending && tagsFor;
  const tagsSaved = saveTags.isSuccess && tagsFor;

  /* ── Free FAQ search ── */
  const faqQuery = faqQueries[chatId] ?? lastCustomerMessage;
  const publishedFaqs = (faqs.data ?? []).filter((f) => f.isPublished);
  const faqMatches = faqOpen
    ? rankByWords(
        publishedFaqs,
        faqQuery,
        (f) => [
          { text: f.title, weight: 3 },
          { text: f.body, weight: 1 },
        ],
        4,
      )
    : [];

  /* ── Reply suggestions ── */
  const goal = goals[chatId] ?? "";
  const replySet = replySets[chatId];
  const repliesOpen = repliesOpenFor === chatId;
  const thisChatCall = suggest.variables?.conversationId === chatId;
  const writing = suggest.isPending && thisChatCall;
  const replyError =
    suggest.isError && thisChatCall
      ? errorText(suggest.error, "Couldn't write suggestions. Try again.")
      : null;
  // Tone or instruction changed since the shown set: the Rewrite button applies them
  const changed =
    !!replySet && (replySet.tone !== tone || replySet.goal !== goal.trim());

  function runSuggest() {
    const g = goal.trim();
    setRepliesOpenFor(chatId);
    suggest.mutate(
      { conversationId: chatId, tone, goal: g || undefined },
      {
        onSuccess: (data) =>
          setReplySets((prev) => ({
            ...prev,
            [chatId]: {
              replies: data.replies,
              sources: data.sources ?? [],
              tone,
              goal: g,
            },
          })),
      },
    );
  }

  function onGoalSubmit(e: FormEvent) {
    e.preventDefault();
    if (!writing) runSuggest();
  }

  return (
    <section
      aria-labelledby={titleId}
      className="shrink-0 border-t border-outline-variant/15 bg-surface-container/30"
    >
      {/* Header: open/close + read state (phones use the chip in the helper row instead) */}
      <div className="flex items-center gap-2 px-4 py-1.5 max-lg:hidden">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="-ml-2 flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1 text-left hover:bg-surface-container/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span
            id={titleId}
            className="shrink-0 text-label font-semibold text-on-surface"
          >
            About this chat
          </span>
          {r?.mood === "URGENT" && (
            <Badge variant="error" dot>
              Urgent
            </Badge>
          )}
          {/* Collapsed: the two key facts so it's still useful */}
          {!expanded && r && mood && (
            <span className="truncate text-caption text-on-surface-variant">
              · {mood.label} · {WANTS[r.wants] ?? sentence(r.wants)}
            </span>
          )}
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 shrink-0 text-on-surface-variant transition-transform motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {expanded && ready && !stale && (
          <span
            className="flex shrink-0 items-center gap-1 text-caption text-on-surface-variant"
            title={`Read ${timeAgo(ready.readAt)}`}
          >
            <Check className="h-3 w-3 text-success" aria-hidden />
            Up to date
          </span>
        )}
      </div>

      <div id={bodyId} hidden={!expanded} className="px-4 pb-1 max-lg:pt-2">
        {saved.isLoading ? (
          <p
            className="pb-2 text-caption text-on-surface-variant"
            role="status"
          >
            <Spinner size="sm" className="mr-2 inline text-primary" /> Loading…
          </p>
        ) : state?.status === "no_customer_messages" ? (
          <p className="pb-2 text-caption text-on-surface-variant">
            Waiting for their first message. There&apos;s nothing to read yet.
          </p>
        ) : reading ? (
          <p
            className="flex items-center gap-2 pb-2 text-caption text-on-surface-variant"
            role="status"
          >
            <Spinner size="sm" className="text-primary" /> Reading the chat…
          </p>
        ) : !r ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            <p className="text-caption text-on-surface-variant">
              See their mood, what they want and what to do next.
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => read.mutate(chatId)}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Read this chat · {readCost}
            </Button>
          </div>
        ) : (
          <>
            {/* The customer wrote since this read: show it, but say so */}
            {stale && (
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warning/10 px-3 py-1.5">
                <p className="text-caption text-on-surface">
                  They&apos;ve written since this was read (
                  {timeAgo(ready!.readAt)}).
                </p>
                <button
                  type="button"
                  onClick={() => read.mutate(chatId)}
                  className="flex items-center gap-1 rounded text-caption font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden />
                  Read again · {readCost}
                </button>
              </div>
            )}
            <dl className={cn("pb-1", stale && "opacity-70")}>
              {mood && (
                <Row label="Mood">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-medium",
                      mood.color,
                    )}
                  >
                    <mood.icon className="h-3.5 w-3.5" aria-hidden />
                    {mood.label}
                  </span>
                  {r.confidence < 0.6 && (
                    <span className="text-on-surface-variant"> (not sure)</span>
                  )}
                  {r.moodReason && (
                    <span className="text-on-surface-variant">
                      {" "}
                      · {r.moodReason}
                    </span>
                  )}
                </Row>
              )}

              <Row label="Wants">
                {WANTS[r.wants] ?? sentence(r.wants)}
                {r.wantsDetail && (
                  <span className="text-on-surface-variant">
                    {" "}
                    · {sentence(r.wantsDetail)}
                  </span>
                )}
              </Row>

              {mentioned.length > 0 && (
                <Row label="Mentioned">
                  <span className="flex flex-wrap gap-1">
                    {mentioned.map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded bg-surface-container px-1.5 py-0.5 text-caption"
                      >
                        <span className="text-on-surface-variant">
                          {sentence(key)}:
                        </span>{" "}
                        {value}
                      </span>
                    ))}
                  </span>
                </Row>
              )}

              {nextStep && (
                <Row label="Next step">
                  <span className="font-medium">{nextStep}</span>
                </Row>
              )}

              {r.tags.length > 0 && (
                <Row label="Tags">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {r.tags.map((t) => (
                      <Badge key={t} variant="muted">
                        {t}
                      </Badge>
                    ))}
                    {tagsSaved ? (
                      <span
                        className="inline-flex items-center gap-1 text-caption font-medium text-success"
                        role="status"
                      >
                        <Check className="h-3 w-3" aria-hidden />
                        Saved to contact
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={savingTags}
                        onClick={() =>
                          saveTags.mutate({
                            conversationId: chatId,
                            labels: r.tags,
                            language: r.language,
                            intent: r.wants,
                            priority: r.priority,
                          })
                        }
                        className="rounded text-caption font-medium text-primary hover:underline disabled:text-on-surface-variant disabled:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {savingTags
                          ? "Saving…"
                          : r.tags.length === 1
                            ? "Save tag to contact"
                            : "Save tags to contact"}
                      </button>
                    )}
                  </span>
                </Row>
              )}

              {priority && (
                <Row label="Priority">
                  <Badge variant={priority.variant} dot>
                    {priority.label}
                  </Badge>
                  <span className="text-on-surface-variant">
                    {" "}
                    · writes in {languageName(r.language)}
                  </span>
                </Row>
              )}
            </dl>
          </>
        )}
        {readError && (
          <p className="pb-2 text-caption text-error" role="alert">
            {readError} No credit was used.
          </p>
        )}
      </div>

      {/* AI helpers: always visible, even when the panel is closed. Phones: one line of
          chips that scrolls sideways, led by the "About this chat" toggle */}
      <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant/10 px-4 py-2 max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:px-2 max-lg:py-1 max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className={cn(
            "flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-body font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden",
            expanded
              ? "border-primary/30 bg-primary/10 text-on-surface"
              : "border-outline-variant text-on-surface",
          )}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          About this chat
          {r?.mood === "URGENT" ? (
            <Badge variant="error" dot>
              Urgent
            </Badge>
          ) : (
            !expanded &&
            mood && (
              <span className={cn("font-normal", mood.color)}>
                · {mood.label}
              </span>
            )
          )}
          {expanded && ready && !stale && (
            <>
              <Check className="h-3.5 w-3.5 text-success" aria-hidden />
              <span className="sr-only">Up to date</span>
            </>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-on-surface-variant transition-transform motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        <Button
          size="sm"
          variant={repliesOpen ? "primary" : "secondary"}
          className="max-lg:h-11 max-lg:shrink-0 max-lg:rounded-full"
          loading={writing}
          aria-expanded={repliesOpen}
          aria-controls={replyRegionId}
          onClick={() => {
            if (repliesOpen && replySet) setRepliesOpenFor(null);
            else if (replySet)
              setRepliesOpenFor(chatId); // reopening shows the last set: free
            else runSuggest();
          }}
        >
          <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
          {replySet
            ? repliesOpen
              ? "Hide suggestions"
              : "Show suggestions"
            : `Suggest a reply · ${replyCost}`}
        </Button>
        <Button
          size="sm"
          variant={faqOpen ? "primary" : "secondary"}
          className="max-lg:h-11 max-lg:shrink-0 max-lg:rounded-full"
          aria-expanded={faqOpen}
          aria-controls={faqOpen ? faqInputId : undefined}
          onClick={() => setFaqFor(faqOpen ? null : chatId)}
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          {faqOpen ? "Hide FAQs" : "Search your FAQs · free"}
        </Button>
      </div>

      {/* Reply suggestions: pick a tone, optionally say what it should do, then Rewrite */}
      {repliesOpen && (
        <div
          id={replyRegionId}
          role="region"
          aria-label="Reply suggestions"
          className="space-y-2.5 px-4 pb-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-caption font-medium text-on-surface-variant"
              id={`${replyRegionId}-tone`}
            >
              Tone
            </span>
            <div
              role="radiogroup"
              aria-labelledby={`${replyRegionId}-tone`}
              className="inline-flex gap-1 rounded-full bg-surface-container p-0.5"
            >
              {TONES.map((t) => {
                const active = tone === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={writing}
                    // Only selects: the Rewrite button spends the credit
                    onClick={() => setTone(t.value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60",
                      active
                        ? "bg-surface-container-lowest text-on-surface shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <IconButton
              size="xs"
              type="button"
              onClick={() => setRepliesOpenFor(null)}
              aria-label="Close reply suggestions"
              className="ml-auto"
            >
              <X className="h-3.5 w-3.5" />
            </IconButton>
          </div>

          <form onSubmit={onGoalSubmit} className="flex items-start gap-2">
            <label htmlFor={goalId} className="sr-only">
              What should the reply do? (optional)
            </label>
            <Input
              id={goalId}
              value={goal}
              maxLength={200}
              disabled={writing}
              onChange={(e) =>
                setGoals((prev) => ({ ...prev, [chatId]: e.target.value }))
              }
              placeholder="What should it do? e.g. ask for their budget"
              className="h-9 text-label"
            />
            <Button
              type="submit"
              size="sm"
              variant={changed ? "primary" : "secondary"}
              disabled={writing}
              className="h-9 shrink-0"
            >
              {replySet ? "Rewrite" : "Suggest"} · {replyCost}
            </Button>
          </form>

          <div aria-live="polite" aria-busy={writing}>
            {writing ? (
              <ul
                className="flex flex-col gap-1.5"
                aria-label="Writing replies"
              >
                {[0, 1, 2].map((i) => (
                  <li
                    key={i}
                    className="h-9 animate-pulse rounded-xl bg-surface-container motion-reduce:animate-none"
                  />
                ))}
              </ul>
            ) : replyError ? (
              <p className="text-caption text-error" role="alert">
                {replyError} No credit was used.
              </p>
            ) : replySet ? (
              <>
                <p className="mb-1.5 text-caption text-on-surface-variant">
                  {changed
                    ? "Press Rewrite to apply the new tone or instruction."
                    : "Click one to put it in your message, then edit or send."}
                </p>
                <ul className="flex max-h-44 flex-col gap-1.5 overflow-y-auto">
                  {replySet.replies.map((reply, i) => (
                    <li
                      key={`${i}-${reply.slice(0, 20)}`}
                      className="flex items-start gap-1"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectReply(reply)}
                        className="min-w-0 flex-1 whitespace-pre-wrap rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-left text-label text-on-surface transition-colors hover:border-primary/30 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {reply}
                      </button>
                      {/* Paid for once, reused free from "/" */}
                      <IconButton
                        size="sm"
                        type="button"
                        onClick={() => setQuickDraft({ content: reply })}
                        aria-label="Save as quick reply"
                        title="Save as quick reply (reuse it free with /)"
                      >
                        <BookmarkPlus className="h-4 w-4" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 flex items-center gap-1 text-caption text-on-surface-variant">
                  <BookOpen className="h-3 w-3 shrink-0" aria-hidden />
                  {replySet.sources.length > 0
                    ? `Used your info: ${replySet.sources.join(", ")}`
                    : "Nothing in your info matched, so check any prices or dates before sending."}
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Free FAQ search: plain word matching against the org's published FAQs, no AI */}
      {faqOpen && (
        <div
          role="region"
          aria-label="Search your FAQs"
          className="space-y-2 px-4 pb-3"
        >
          <div className="flex items-center gap-2">
            <label htmlFor={faqInputId} className="sr-only">
              Search your FAQs
            </label>
            <Input
              id={faqInputId}
              value={faqQuery}
              onChange={(e) =>
                setFaqQueries((prev) => ({ ...prev, [chatId]: e.target.value }))
              }
              placeholder="Search your FAQs, e.g. delivery, price"
              className="h-9 text-label"
            />
            <IconButton
              size="xs"
              type="button"
              onClick={() => setFaqFor(null)}
              aria-label="Close FAQ search"
            >
              <X className="h-3.5 w-3.5" />
            </IconButton>
          </div>

          <div aria-live="polite">
            {faqs.isLoading ? (
              <p className="flex items-center gap-2 text-caption text-on-surface-variant">
                <Spinner size="sm" /> Loading your FAQs…
              </p>
            ) : faqs.isError ? (
              <p className="text-caption text-error" role="alert">
                {errorText(faqs.error, "Couldn't load your FAQs. Try again.")}
              </p>
            ) : publishedFaqs.length === 0 ? (
              <p className="text-caption text-on-surface-variant">
                You have no FAQs yet. Add them on the Bot knowledge page and
                they&apos;ll show up here.
              </p>
            ) : faqMatches.length === 0 ? (
              <p className="text-caption text-on-surface-variant">
                No FAQ matches. Try other words, or use Suggest a reply.
              </p>
            ) : (
              <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                {faqMatches.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-2.5"
                  >
                    <p className="text-label font-semibold text-on-surface">
                      {f.title}
                    </p>
                    <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-label text-on-surface-variant">
                      {f.body}
                    </p>
                    <button
                      type="button"
                      onClick={() => onSelectReply(f.body)}
                      className="mt-1.5 rounded text-caption font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      Use as reply
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <QuickReplyManager
        open={!!quickDraft}
        draft={quickDraft}
        onClose={() => setQuickDraft(null)}
      />
    </section>
  );
}
