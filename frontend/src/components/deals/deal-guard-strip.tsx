"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck, Ghost, MessageSquareText, ClipboardCheck, Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDealGuard, useDraftScope, useSaveScope, useSendScope } from "@/hooks/use-deals";
import type { Deal, DealGuard, GhostLevel, ScopeStatus } from "@/lib/types/deals";

const GHOST_STYLE: Record<GhostLevel, { label: string; dot: string; text: string }> = {
  active: { label: "Active", dot: "bg-success", text: "text-success" },
  your_turn: { label: "Your turn", dot: "bg-primary", text: "text-primary" },
  slow: { label: "Slowing down", dot: "bg-warning", text: "text-warning" },
  cold: { label: "Going cold", dot: "bg-error", text: "text-error" },
  no_chat: { label: "No chat yet", dot: "bg-on-surface-variant/40", text: "text-on-surface-variant" },
};

const SCOPE_LABEL: Record<ScopeStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-surface-container-high text-on-surface-variant" },
  SENT: { label: "Waiting for client", className: "bg-warning-container text-warning" },
  APPROVED: { label: "Approved", className: "bg-success-container text-success" },
  CHANGES_REQUESTED: { label: "Changes requested", className: "bg-error-container text-error" },
};

const LABEL = "text-label font-medium text-on-surface-variant uppercase tracking-wide";

/** Ghost radar, trust card and scope lock for one deal — shown inside the Deal card. */
export function DealGuardStrip({ deal, onUseMessage }: { deal: Deal; onUseMessage?: (text: string) => void }) {
  const { data: guard } = useDealGuard(deal.pipelineId, deal.id);
  if (!guard) return null;

  return (
    <div className="space-y-3">
      <span className={LABEL}>Deal Guard</span>
      <GhostRow guard={guard} onUseMessage={onUseMessage} />
      <TrustRow guard={guard} />
      {deal.status === "OPEN" && <ScopeLock key={guard.scope.summary ?? ""} deal={deal} guard={guard} />}
    </div>
  );
}

function GhostRow({ guard, onUseMessage }: { guard: DealGuard; onUseMessage?: (text: string) => void }) {
  const style = GHOST_STYLE[guard.ghost.level];
  return (
    <div className="rounded-lg bg-surface-container p-3">
      <p className={cn("flex items-center gap-2 text-body font-medium", style.text)}>
        <Ghost className="h-4 w-4 shrink-0" />
        <span className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)} aria-hidden />
        {style.label}
      </p>
      <p className="mt-1 text-label text-on-surface-variant">{guard.ghost.reason}</p>
      {guard.ghost.suggestion && onUseMessage && (
        <Button
          size="sm"
          variant="ghost"
          className="-ml-2 mt-1"
          onClick={() => onUseMessage(guard.ghost.suggestion!)}
          title={guard.ghost.suggestion}
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          Use suggested nudge
        </Button>
      )}
    </div>
  );
}

function TrustRow({ guard }: { guard: DealGuard }) {
  const { trust } = guard;
  const risky = trust.standing === "risky";
  const Icon = risky ? ShieldAlert : ShieldCheck;

  return (
    <div className={cn("rounded-lg p-3", risky ? "bg-error-container/60" : "bg-surface-container")}>
      <p className={cn("flex items-center gap-2 text-body font-medium", risky ? "text-error" : "text-on-surface")}>
        <Icon className="h-4 w-4 shrink-0" />
        {risky ? "Possible scam" : trust.standing === "returning" ? "Returning client" : "New client"}
      </p>
      <p className="mt-1 text-label text-on-surface-variant">{trust.summary}</p>
      {trust.flags.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {trust.flags.map((flag) => (
            <li key={flag.label} className="text-label">
              <span className="font-medium text-error">{flag.label}</span>
              <span className="block truncate text-on-surface-variant" title={flag.excerpt}>
                “{flag.excerpt}”
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-label text-on-surface">
        Suggested advance: <strong className="tabular-nums">{trust.suggestedAdvancePct}%</strong>
        {trust.suggestedAdvancePct === 100 && " (full payment upfront)"}
      </p>
    </div>
  );
}

function ScopeLock({ deal, guard }: { deal: Deal; guard: DealGuard }) {
  const draft = useDraftScope();
  const save = useSaveScope();
  const send = useSendScope();
  // Remounted (via key) when the saved summary changes, so a fresh draft shows up
  const [text, setText] = useState(guard.scope.summary ?? "");
  const [editing, setEditing] = useState(false);

  const ids = { pipelineId: deal.pipelineId, dealId: deal.id };
  const status = guard.scope.status;
  const dirty = text.trim() !== (guard.scope.summary ?? "").trim();
  const hasBlanks = text.includes("…");

  return (
    <div className="rounded-lg bg-surface-container p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-body font-medium text-on-surface">
          <ClipboardCheck className="h-4 w-4 shrink-0" />
          Scope lock
        </p>
        {status && (
          <span className={cn("rounded-full px-2 py-0.5 text-caption", SCOPE_LABEL[status].className)}>
            {SCOPE_LABEL[status].label}
          </span>
        )}
      </div>

      {!guard.scope.summary && !editing ? (
        <>
          <p className="mt-1 text-label text-on-surface-variant">
            Get the client to approve what&apos;s included before you start.
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="-ml-2 mt-1"
            loading={draft.isPending}
            onClick={() => draft.mutate(ids)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Draft scope from chat
          </Button>
        </>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => {
              setEditing(true);
              setText(e.target.value);
            }}
            rows={6}
            maxLength={1500}
            className="mt-2 w-full resize-y rounded-md border border-outline-variant/30 bg-surface-container-low px-2.5 py-2 text-label text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
          />
          {hasBlanks && (
            <p className="mt-1 text-caption text-warning">Fill in the “…” parts before sending.</p>
          )}
          {status === "CHANGES_REQUESTED" && (
            <p className="mt-1 text-caption text-error">The client asked for changes — check the chat, update, and send again.</p>
          )}
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            {dirty && (
              <Button
                size="sm"
                variant="ghost"
                loading={save.isPending}
                disabled={!text.trim()}
                onClick={() => save.mutate({ ...ids, summary: text }, { onSuccess: () => setEditing(false) })}
              >
                Save
              </Button>
            )}
            {status !== "APPROVED" && (
              <Button
                size="sm"
                loading={send.isPending}
                disabled={dirty || hasBlanks || !text.trim() || status === "SENT"}
                title={status === "SENT" ? "Already sent — waiting for the client's vote" : undefined}
                onClick={() => send.mutate(ids)}
              >
                <Send className="h-3.5 w-3.5" />
                {status === "CHANGES_REQUESTED" ? "Send again" : "Send for approval"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
