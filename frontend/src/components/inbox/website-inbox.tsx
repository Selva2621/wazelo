"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, Globe, Hand, PanelRight, RotateCcw, Send, Square, X } from "lucide-react";
import { toast } from "sonner";
import {
  acceptWebsiteChat,
  declineWebsiteChat,
  getWebsiteChat,
  listWebsiteChats,
  releaseWebsiteChat,
  replyToWebsiteChat,
  setWebsiteChatStatus,
  type WebsiteChatDetail,
  type WebsiteChatMessage,
  type WebsiteChatSummary,
} from "@/lib/api/widget";
import { InboxChannelTabs } from "@/components/inbox/inbox-channel-tabs";
import { WebsiteChatPanel } from "@/components/inbox/website-chat-panel";
import { useWebsiteChatSocket } from "@/hooks/use-website-chat-socket";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const visitorLabel = (c: { visitorName: string | null; visitorPhone: string | null; id: string }) =>
  c.visitorName?.trim() || c.visitorPhone || `Visitor ${c.id.slice(0, 4).toUpperCase()}`;

/** "https://www.shop.acme.com/pricing" → "shop.acme.com"; one widget can sit on many sites */
function siteOf(pageUrl: string | null): string | null {
  if (!pageUrl) return null;
  try {
    return new URL(pageUrl).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "2 min ago" for how long a visitor has been waiting */
function waitedFor(iso: string | null) {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : `${Math.round(min / 60)} h ago`;
}

function errText(err: unknown, fallback: string) {
  const e = err as { message?: string; response?: { data?: { message?: string | string[] } } };
  const m = e?.response?.data?.message ?? e?.message;
  return (Array.isArray(m) ? m[0] : m) || fallback;
}

/**
 * Inbox → Website: chats from the website chat widget. Visitors who asked for a
 * person come first; a member accepts (or passes), then chats with AI help beside
 * the conversation and decides whether the visitor is a lead.
 */
export function WebsiteInbox() {
  useWebsiteChatSocket();
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // A notification can open a chat directly: /inbox?channel=website&chat=<id>
  const linkedChat = useSearchParams().get("chat");
  const [openedLink, setOpenedLink] = useState<string | null>(null);
  if (linkedChat && linkedChat !== openedLink) {
    setOpenedLink(linkedChat);
    setSelectedId(linkedChat);
  }

  const list = useQuery({
    queryKey: ["website-chats", status],
    queryFn: () => listWebsiteChats(status),
    refetchInterval: 10_000,
  });
  const allChats = list.data?.data ?? [];

  // Site filter: only shown once chats come from more than one website
  const [site, setSite] = useState("all");
  const sites = [...new Set(allChats.map((c) => siteOf(c.pageUrl)).filter((s): s is string => !!s))].sort();
  if (site !== "all" && !sites.includes(site)) sites.push(site);
  const multiSite = sites.length > 1 || site !== "all";
  const chats = site === "all" ? allChats : allChats.filter((c) => siteOf(c.pageUrl) === site);
  const waiting = chats.filter((c) => c.state === "WAITING");
  const others = chats.filter((c) => c.state !== "WAITING");

  const row = (c: WebsiteChatSummary) => (
    <ChatRow
      key={c.id}
      chat={c}
      site={multiSite && site === "all" ? siteOf(c.pageUrl) : null}
      active={c.id === selectedId}
      onSelect={() => setSelectedId(c.id)}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-var(--header-height))]">
      {/* Left: chat list (full width on mobile until a chat is opened) */}
      <div className={cn("w-full shrink-0 flex-col lg:flex lg:w-[340px] lg:border-r lg:border-outline-variant", selectedId ? "hidden" : "flex")}>
        <div className="space-y-3 border-b border-outline-variant p-4">
          <InboxChannelTabs active="website" />
          {multiSite && (
            <div className="flex items-center gap-2">
              <label htmlFor="website-site-filter" className="shrink-0 text-label text-on-surface-variant">
                Site
              </label>
              <Select
                id="website-site-filter"
                size="sm"
                value={site}
                onChange={(e) => {
                  setSite(e.target.value);
                  setSelectedId(null);
                }}
                className="min-w-0 flex-1 font-medium"
              >
                <option value="all">All sites</option>
                {sites.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div role="group" aria-label="Chat status" className="flex gap-1.5">
            {(["open", "closed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => {
                  setStatus(s);
                  setSelectedId(null);
                }}
                className={cn(
                  "h-7 rounded-full border px-3 text-caption font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                  status === s ? "border-transparent bg-on-surface text-surface" : "border-outline-variant text-on-surface-variant hover:text-on-surface",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {list.isLoading ? (
            <div className="flex justify-center py-10"><Spinner size="sm" /></div>
          ) : chats.length === 0 ? (
            <div className="space-y-2 px-6 py-12 text-center">
              <Globe className="mx-auto h-8 w-8 text-on-surface-variant/50" aria-hidden />
              <p className="text-body font-medium text-on-surface">No {status} website chats</p>
              <p className="text-label text-on-surface-variant">Messages from the chat widget on your website show up here.</p>
            </div>
          ) : (
            <>
              {waiting.length > 0 && (
                <section aria-labelledby="waiting-heading" data-tour="website-waiting">
                  <h2 id="waiting-heading" className="bg-warning-container/60 px-4 py-1.5 text-caption font-semibold text-warning">
                    Waiting for a person · {waiting.length}
                  </h2>
                  <ul>{waiting.map(row)}</ul>
                </section>
              )}
              {others.length > 0 && (
                <section aria-label="Other chats">
                  {waiting.length > 0 && <h2 className="px-4 pb-1 pt-3 text-caption font-semibold text-on-surface-variant">Other chats</h2>}
                  <ul>{others.map(row)}</ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: the conversation */}
      <div className={cn("min-w-0 flex-1", selectedId ? "flex" : "hidden lg:flex")}>
        {selectedId ? (
          <ChatThread key={selectedId} id={selectedId} onBack={() => setSelectedId(null)} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <p className="text-body text-on-surface-variant">Pick a website chat to read and reply.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatRow({
  chat,
  site,
  active,
  onSelect,
}: {
  chat: WebsiteChatSummary;
  /** Which website it came from; only set when chats come from several sites */
  site: string | null;
  active: boolean;
  onSelect: () => void;
}) {
  const name = visitorLabel(chat);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
          active ? "bg-primary/10" : "hover:bg-surface-container",
        )}
      >
        <Avatar name={name} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-body font-medium text-on-surface">{name}</span>
            {chat.lastMessage && <span className="shrink-0 text-caption text-on-surface-variant">{timeLabel(chat.lastMessage.createdAt)}</span>}
          </span>
          <span className="mt-0.5 block truncate text-label text-on-surface-variant">
            {chat.lastMessage?.sender === "bot" ? "AI: " : chat.lastMessage?.sender === "agent" ? "Team: " : ""}
            {chat.lastMessage?.body ?? ""}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {chat.state === "WAITING" && (
              <Badge variant="warning" dot>
                Wants a person · {waitedFor(chat.handoffRequestedAt)}
              </Badge>
            )}
            {chat.offeredToMe && <Badge variant="primary">Offered to you</Badge>}
            {chat.state === "PERSON" && chat.assignedTo && <Badge variant="info">{chat.assignedTo.name}</Badge>}
            {chat.state === "AI" && chat.waiting && <Badge variant="muted">AI answering</Badge>}
            {chat.leadDecision === "LEAD" && <Badge variant="success">Lead</Badge>}
            {site && (
              <span className="flex items-center gap-1 truncate text-caption text-on-surface-variant">
                <Globe className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{site}</span>
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

function Bubble({ m }: { m: WebsiteChatMessage }) {
  if (m.sender === "system") {
    return <p className="py-1 text-center text-caption text-on-surface-variant">{m.body}</p>;
  }
  const fromVisitor = m.sender === "visitor";
  return (
    <div className={cn("flex", fromVisitor ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-body",
          fromVisitor && "rounded-bl-sm bg-surface-container-high text-on-surface",
          m.sender === "agent" && "rounded-br-sm bg-primary text-on-primary",
          m.sender === "bot" && "rounded-br-sm border border-outline-variant bg-surface-container-lowest text-on-surface",
        )}
      >
        {m.sender === "bot" && (
          <span className="mb-0.5 flex items-center gap-1 text-caption font-medium text-on-surface-variant">
            <Bot className="h-3 w-3" aria-hidden /> AI assistant
          </span>
        )}
        {m.sender === "agent" && m.senderName && <span className="mb-0.5 block text-caption font-medium text-on-primary/80">{m.senderName}</span>}
        <p className="whitespace-pre-wrap break-words">{m.body}</p>
        <p className={cn("mt-1 text-right text-caption", m.sender === "agent" ? "text-on-primary/80" : "text-on-surface-variant")}>{timeLabel(m.createdAt)}</p>
      </div>
    </div>
  );
}

/** Above the messages: what's happening and what this member can do about it */
function StateBanner({
  chat,
  me,
  busy,
  onAccept,
  onDecline,
}: {
  chat: WebsiteChatDetail;
  me: string | undefined;
  busy: "accept" | "decline" | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  if (chat.state === "WAITING") {
    return (
      <div role="status" data-tour="website-handoff-banner" className="flex flex-wrap items-center gap-3 border-b border-warning/30 bg-warning-container px-4 py-3">
        <Hand className="h-4 w-4 shrink-0 text-warning" aria-hidden />
        <p className="min-w-0 flex-1 text-body text-on-surface">
          <span className="font-semibold">{visitorLabel(chat)}</span> wants to talk to a person
          <span className="text-on-surface-variant"> · asked {waitedFor(chat.handoffRequestedAt)}</span>
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={onAccept} loading={busy === "accept"}>Accept</Button>
          <Button size="sm" variant="secondary" onClick={onDecline} loading={busy === "decline"}>Decline</Button>
        </div>
      </div>
    );
  }
  if (chat.state === "PERSON" && chat.assignedTo && chat.assignedTo.id !== me) {
    return (
      <p role="status" className="border-b border-outline-variant bg-surface-container px-4 py-2 text-label text-on-surface-variant">
        {chat.assignedTo.name} is handling this chat.
      </p>
    );
  }
  if (chat.state === "AI") {
    return (
      <p className="border-b border-outline-variant bg-surface-container px-4 py-2 text-label text-on-surface-variant">
        The AI assistant is answering. Reply to take the chat.
      </p>
    );
  }
  if (chat.state === "ENDED") {
    return (
      <p className="border-b border-outline-variant bg-surface-container px-4 py-2 text-label text-on-surface-variant">
        This chat has ended. Replying starts it again.
      </p>
    );
  }
  return null;
}

function ChatThread({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const thread = useQuery({
    queryKey: ["website-chat", id],
    queryFn: () => getWebsiteChat(id),
    refetchInterval: 5_000,
  });
  const messages = thread.data?.messages ?? [];
  const chat = thread.data?.chat;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Escape closes the details drawer
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanelOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["website-chat", id] });
    void qc.invalidateQueries({ queryKey: ["website-chats"] });
    void qc.invalidateQueries({ queryKey: ["website-chat-timeline", id] });
  };

  const send = useMutation({
    mutationFn: (body: string) => replyToWebsiteChat(id, body),
    onSuccess: () => {
      setText("");
      refresh();
    },
    onError: (err) => toast.error(errText(err, "Couldn't send the reply. Try again.")),
  });
  const handoff = useMutation({
    mutationFn: (action: "accept" | "decline" | "release") =>
      action === "accept" ? acceptWebsiteChat(id) : action === "decline" ? declineWebsiteChat(id) : releaseWebsiteChat(id),
    onSuccess: (_d, action) => {
      toast.success(action === "accept" ? "You took the chat" : action === "decline" ? "Passed to the team" : "The AI assistant has the chat again");
      refresh();
      if (action === "accept") inputRef.current?.focus();
    },
    onError: (err) => {
      toast.error(errText(err, "Couldn't do that. Try again."));
      refresh();
    },
  });
  const status = useMutation({
    mutationFn: (s: "open" | "closed") => setWebsiteChatStatus(id, s),
    onSuccess: (_d, s) => {
      toast.success(s === "closed" ? "Chat ended" : "Chat reopened");
      refresh();
    },
    onError: (err) => toast.error(errText(err, "Couldn't update the chat. Try again.")),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (body && !send.isPending) send.mutate(body);
  };

  if (thread.isLoading || !chat) {
    return <div className="flex flex-1 items-center justify-center"><Spinner size="sm" /></div>;
  }

  const name = visitorLabel(chat);
  const mine = chat.state === "PERSON" && chat.assignedTo?.id === me;
  const someoneElse = chat.state === "PERSON" && !!chat.assignedTo && chat.assignedTo.id !== me;
  const busy = handoff.isPending && handoff.variables !== "release" ? (handoff.variables ?? null) : null;

  const panel = (
    <WebsiteChatPanel
      chat={chat}
      canAct={!someoneElse}
      onPickReply={(r) => {
        setText(r);
        setPanelOpen(false);
        inputRef.current?.focus();
      }}
    />
  );

  return (
    <div className="flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-outline-variant px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to website chats"
            className="rounded-lg p-1.5 text-on-surface-variant outline-none hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-focus lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Avatar name={name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-on-surface">{name}</p>
            <p className="truncate text-caption text-on-surface-variant">
              {chat.pageUrl ? `from ${chat.pageUrl.replace(/^https?:\/\//, "").slice(0, 60)}` : "Website chat"}
            </p>
          </div>
          {mine && (
            <Button size="sm" variant="ghost" onClick={() => handoff.mutate("release")} loading={handoff.isPending && handoff.variables === "release"}>
              <Bot className="h-4 w-4" aria-hidden /> <span className="max-sm:sr-only">Hand back to AI</span>
            </Button>
          )}
          {chat.state !== "ENDED" ? (
            <Button size="sm" variant="secondary" onClick={() => status.mutate("closed")} loading={status.isPending} disabled={someoneElse}>
              <Square className="h-3.5 w-3.5" aria-hidden /> <span className="max-sm:sr-only">End chat</span>
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => status.mutate("open")} loading={status.isPending}>
              <RotateCcw className="h-4 w-4" aria-hidden /> <span className="max-sm:sr-only">Reopen</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="xl:hidden"
            aria-label="Visitor details, AI help and timeline"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen(true)}
          >
            <PanelRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <StateBanner chat={chat} me={me} busy={busy} onAccept={() => handoff.mutate("accept")} onDecline={() => handoff.mutate("decline")} />

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
          {messages.map((m) => <Bubble key={m.id} m={m} />)}
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="flex shrink-0 items-end gap-2 border-t border-outline-variant p-3">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 4096))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(e);
              }
            }}
            rows={1}
            disabled={someoneElse}
            placeholder={someoneElse ? `${chat.assignedTo?.name} is handling this chat` : "Reply on the website…"}
            aria-label="Reply"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body text-on-surface placeholder:text-placeholder outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
          />
          <Button type="submit" aria-label="Send reply" disabled={!text.trim() || someoneElse} loading={send.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Wide screens: always beside the chat */}
      <aside aria-label="Visitor details, AI help and timeline" className="hidden w-80 shrink-0 border-l border-outline-variant xl:block">
        {panel}
      </aside>

      {/* Narrower screens: a drawer */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button type="button" aria-label="Close details" className="absolute inset-0 bg-black/40" onClick={() => setPanelOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Visitor details, AI help and timeline" className="absolute inset-y-0 right-0 flex w-[min(22rem,100%)] flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
              <p className="text-body font-semibold text-on-surface">Details</p>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close details"
                className="rounded-lg p-1.5 text-on-surface-variant outline-none hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-focus"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">{panel}</div>
          </div>
        </div>
      )}
    </div>
  );
}
