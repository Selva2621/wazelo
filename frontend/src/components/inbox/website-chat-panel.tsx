"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Mail, Phone, Sparkles, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  decideWebsiteLead,
  getWebsiteChatTimeline,
  suggestWebsiteReplies,
  summarizeWebsiteChat,
  type WebsiteChatDetail,
  type WebsiteChatEvent,
} from "@/lib/api/widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const section = "space-y-2 border-b border-outline-variant px-4 py-4 last:border-b-0";
const heading = "text-label font-semibold text-on-surface";
const hint = "text-caption text-on-surface-variant";

function errText(err: unknown, fallback: string) {
  const e = err as { message?: string; response?: { data?: { message?: string | string[] } } };
  const m = e?.response?.data?.message ?? e?.message;
  return (Array.isArray(m) ? m[0] : m) || fallback;
}

/**
 * Inbox → Website, right side: who the visitor is, AI help (summary + replies to
 * pick from), the lead decision, and everything that happened in the chat.
 * AI help runs only when asked (it uses AI credits).
 */
export function WebsiteChatPanel({
  chat,
  canAct,
  onPickReply,
}: {
  chat: WebsiteChatDetail;
  /** This member is handling the chat (or nobody is): AI help and the lead choice are theirs */
  canAct: boolean;
  onPickReply: (text: string) => void;
}) {
  const qc = useQueryClient();
  const timeline = useQuery({
    queryKey: ["website-chat-timeline", chat.id],
    queryFn: () => getWebsiteChatTimeline(chat.id),
    refetchInterval: 15_000,
  });

  const summary = useMutation({
    mutationFn: () => summarizeWebsiteChat(chat.id),
    onError: (err) => toast.error(errText(err, "Couldn't summarise this chat")),
    onSettled: () => void qc.invalidateQueries({ queryKey: ["website-chat-timeline", chat.id] }),
  });
  const replies = useMutation({
    mutationFn: () => suggestWebsiteReplies(chat.id),
    onError: (err) => toast.error(errText(err, "Couldn't write suggestions")),
    onSettled: () => void qc.invalidateQueries({ queryKey: ["website-chat-timeline", chat.id] }),
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto" data-tour="website-chat-panel">
      {/* Visitor */}
      <section aria-labelledby="visitor-heading" className={section}>
        <h3 id="visitor-heading" className={heading}>Visitor</h3>
        <p className="flex items-center gap-2 text-body text-on-surface">
          <Phone className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden />
          {chat.visitorPhone ?? "—"}
        </p>
        <p className="flex items-center gap-2 break-all text-body text-on-surface">
          <Mail className="h-3.5 w-3.5 shrink-0 text-on-surface-variant" aria-hidden />
          {chat.visitorEmail ?? "—"}
        </p>
        {chat.consentAt ? (
          <Badge variant="success" dot>Agreed to be contacted</Badge>
        ) : (
          <Badge variant="muted" dot>No consent to contact</Badge>
        )}
        {chat.contactId && (
          <p className={hint}>
            Saved as a contact.{" "}
            <Link href={`/contacts/${chat.contactId}`} className="font-medium text-primary hover:underline">
              Open contact
            </Link>
          </p>
        )}
      </section>

      {/* AI help */}
      <section aria-labelledby="ai-heading" className={section} data-tour="website-chat-ai">
        <h3 id="ai-heading" className={cn(heading, "flex items-center gap-1.5")}>
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden /> AI help
        </h3>
        {summary.data ? (
          <div className="space-y-2 rounded-lg bg-surface-container px-3 py-2.5">
            <p className="text-body text-on-surface">{summary.data.summary}</p>
            {summary.data.openQuestions.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-4 text-label text-on-surface-variant">
                {summary.data.openQuestions.map((q) => <li key={q}>{q}</li>)}
              </ul>
            )}
            {Object.keys(summary.data.mentioned).length > 0 && (
              <p className={hint}>
                {Object.entries(summary.data.mentioned).map(([k, v]) => `${k}: ${v}`).join(" · ")}
              </p>
            )}
            <p className={hint}>
              Lead?{" "}
              {summary.data.leadHint === "LIKELY" ? "Looks likely" : summary.data.leadHint === "UNLIKELY" ? "Probably not" : "Not sure yet"}
            </p>
          </div>
        ) : (
          <Button size="sm" variant="secondary" className="w-full" loading={summary.isPending} disabled={!canAct} onClick={() => summary.mutate()}>
            Summarise chat
          </Button>
        )}

        {replies.data ? (
          <div className="space-y-1.5">
            <p className={hint}>Tap one to put it in your reply. Edit before sending.</p>
            {replies.data.replies.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onPickReply(r)}
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-left text-label text-on-surface outline-none transition-colors hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-focus"
              >
                {r}
              </button>
            ))}
            <Button size="sm" variant="ghost" className="w-full" loading={replies.isPending} onClick={() => replies.mutate()}>
              New suggestions
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" className="w-full" loading={replies.isPending} disabled={!canAct} onClick={() => replies.mutate()}>
            Suggest replies
          </Button>
        )}
        {!canAct && <p className={hint}>Take the chat to use AI help.</p>}
      </section>

      {/* Lead or not */}
      <LeadSection chat={chat} canAct={canAct} />

      {/* Everything that happened */}
      <section aria-labelledby="timeline-heading" className={section} data-tour="website-chat-timeline">
        <h3 id="timeline-heading" className={heading}>Timeline</h3>
        {timeline.isLoading ? (
          <Spinner size="sm" />
        ) : (
          <ol className="space-y-2">
            {(timeline.data ?? []).map((e) => (
              <TimelineItem key={e.id} e={e} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function LeadSection({ chat, canAct }: { chat: WebsiteChatDetail; canAct: boolean }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState(chat.visitorPhone ?? "");
  const decide = useMutation({
    mutationFn: (decision: "LEAD" | "NOT_LEAD") =>
      decideWebsiteLead(chat.id, decision === "LEAD" ? { decision, phone: phone.trim() || undefined } : { decision }),
    onSuccess: (r) => {
      toast.success(
        r.decision === "LEAD"
          ? r.consent
            ? "Saved as a lead"
            : "Saved as a lead. No automated messages: they didn't agree to be contacted."
          : "Marked as not a lead",
      );
      void qc.invalidateQueries({ queryKey: ["website-chat", chat.id] });
      void qc.invalidateQueries({ queryKey: ["website-chat-timeline", chat.id] });
      void qc.invalidateQueries({ queryKey: ["website-chats"] });
    },
    onError: (err) => toast.error(errText(err, "Couldn't save the decision")),
  });

  return (
    <section aria-labelledby="lead-heading" className={section} data-tour="website-chat-lead">
      <h3 id="lead-heading" className={heading}>Lead?</h3>
      {chat.leadDecision === "LEAD" ? (
        <p className="flex items-center gap-1.5 text-body text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Saved as a lead
        </p>
      ) : chat.leadDecision === "NOT_LEAD" ? (
        <p className="flex items-center gap-1.5 text-body text-on-surface-variant">
          <XCircle className="h-4 w-4" aria-hidden /> Not a lead
        </p>
      ) : (
        <>
          {!chat.visitorPhone && (
            <div>
              <label htmlFor="lead-phone" className={hint}>WhatsApp number</label>
              <input
                id="lead-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-body outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={!canAct} loading={decide.isPending && decide.variables === "LEAD"} onClick={() => decide.mutate("LEAD")}>
              <UserPlus className="h-4 w-4" aria-hidden /> Save as lead
            </Button>
            <Button size="sm" variant="secondary" className="flex-1" disabled={!canAct} loading={decide.isPending && decide.variables === "NOT_LEAD"} onClick={() => decide.mutate("NOT_LEAD")}>
              Not a lead
            </Button>
          </div>
          {!chat.consentAt && <p className={hint}>They didn&apos;t agree to be contacted: no automated messages will go to them.</p>}
        </>
      )}
    </section>
  );
}

const TRIGGERS: Record<string, string> = {
  ASKED_FOR_PERSON: "Asked to talk to a person",
  BUTTON: 'Tapped "Talk to a person"',
  UNANSWERED: "AI handed over (couldn't answer)",
};
const REASONS: Record<string, string> = {
  AFTER_HOURS: "outside opening hours",
  NO_ONE_ONLINE: "nobody online",
  TIMEOUT: "nobody took it in time",
  ALL_DECLINED: "everyone passed",
  CONSENT: "visitor will be contacted",
  UNAVAILABLE: "nobody free; visitor will be contacted",
  MEMBER: "by the team",
  VISITOR: "by the visitor",
  IDLE: "no messages for 30 minutes",
};

/** One line per step, in plain words */
export function describeEvent(e: WebsiteChatEvent): { text: string; tone?: "error" } {
  const d = e.data ?? {};
  const who = e.actorName ?? "Someone";
  const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  switch (e.type) {
    case "STARTED": return { text: d.consent ? "Chat started · agreed to be contacted" : "Chat started" };
    case "CONSENT_GIVEN": return { text: "Agreed to be contacted on WhatsApp and email" };
    case "CONTACT_CREATED": return { text: "Saved as a new contact · welcome waits until the chat ends" };
    case "CONTACT_LINKED": return { text: "Linked to an existing contact" };
    case "WELCOME_TRIGGERED":
      return d.ran ? { text: "Welcome automation started" } : { text: `Welcome not sent (${String(d.why ?? "")})`, tone: "error" };
    case "AI_ANSWERED": return { text: "AI answered" };
    case "AI_NOT_FOUND": return { text: "AI couldn't answer" };
    case "AI_BLOCKED": return { text: "AI reply stopped by the safety check", tone: "error" };
    case "AI_SKIPPED":
      return { text: d.reason === "NO_CREDITS" ? "AI skipped: no AI credits left" : "AI skipped: reply limit reached", tone: "error" };
    case "HANDOFF_REQUESTED": return { text: TRIGGERS[String(d.trigger)] ?? "Asked for a person" };
    case "TEAM_NOTIFIED": return { text: `Team alerted (${count(d.userIds)})` };
    case "OFFERED": return { text: d.mode === "AUTO" ? "Offered to one member (auto-assign)" : `Offered to ${count(d.userIds)} online` };
    case "DECLINED": return { text: `${who} passed` };
    case "OFFER_EXPIRED": return { text: "An offer ran out" };
    case "ACCEPTED": return { text: d.how === "REPLIED" ? `${who} replied and took the chat` : `${who} took the chat` };
    case "NO_ONE_AVAILABLE": return { text: `Nobody available: ${REASONS[String(d.reason)] ?? String(d.reason)}` };
    case "FOLLOW_UP_OFFERED": return { text: 'Visitor offered "Yes, contact me"' };
    case "RELEASED_TO_AI": return { text: `${who} gave the chat back to the AI` };
    case "LEAD_SAVED": return { text: `${who} saved them as a lead${d.consent ? "" : " (no consent: automations off)"}` };
    case "LEAD_DISMISSED": return { text: `${who} marked: not a lead` };
    case "AI_ASSIST": return { text: `${who} used AI ${d.kind === "summary" ? "summary" : "suggestions"}` };
    case "REOPENED": return { text: "Chat started again" };
    case "ENDED": return { text: `Chat ended (${REASONS[String(d.reason)] ?? String(d.reason)})` };
    case "FAILED": return { text: `Failed: ${String(d.step ?? "")} — ${String(d.error ?? "")}`, tone: "error" };
    default: return { text: e.type };
  }
}

function TimelineItem({ e }: { e: WebsiteChatEvent }) {
  const { text, tone } = describeEvent(e);
  return (
    <li className="flex gap-2">
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", tone === "error" ? "bg-error" : "bg-outline")} aria-hidden />
      <span className="min-w-0">
        <span className={cn("block text-label", tone === "error" ? "text-error" : "text-on-surface")}>
          {tone === "error" && <AlertTriangle className="mr-1 inline h-3 w-3" aria-hidden />}
          {text}
        </span>
        <time dateTime={e.createdAt} className="text-caption text-on-surface-variant">
          {new Date(e.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
        </time>
      </span>
    </li>
  );
}
