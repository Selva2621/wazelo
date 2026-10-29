"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, CheckCircle2, ChevronDown, Globe, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import {
  getWebsiteChat,
  listWebsiteChats,
  replyToWebsiteChat,
  setWebsiteChatStatus,
  type WebsiteChatMessage,
  type WebsiteChatSummary,
} from "@/lib/api/widget";
import { InboxChannelTabs } from "@/components/inbox/inbox-channel-tabs";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

/**
 * Inbox → Website: chats from the website chat widget. Replies go to the visitor's
 * widget within a few seconds; while someone replies, the widget's AI stays quiet.
 */
export function WebsiteInbox() {
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
              <div className="relative min-w-0 flex-1">
                <select
                  id="website-site-filter"
                  value={site}
                  onChange={(e) => {
                    setSite(e.target.value);
                    setSelectedId(null);
                  }}
                  className="h-8 w-full appearance-none truncate rounded-lg border border-outline-variant bg-surface-container-lowest pl-2.5 pr-8 text-label font-medium text-on-surface outline-none transition-colors hover:border-outline focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <option value="all">All sites</option>
                  {sites.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant"
                  aria-hidden
                />
              </div>
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
                  status === s
                    ? "border-transparent bg-on-surface text-surface"
                    : "border-outline-variant text-on-surface-variant hover:text-on-surface",
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
              <p className="text-label text-on-surface-variant">
                Messages from the chat widget on your website show up here.
              </p>
            </div>
          ) : (
            <ul>
              {chats.map((c) => (
                <ChatRow
                  key={c.id}
                  chat={c}
                  site={multiSite && site === "all" ? siteOf(c.pageUrl) : null}
                  active={c.id === selectedId}
                  onSelect={() => setSelectedId(c.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right: the conversation */}
      <div className={cn("min-w-0 flex-1 flex-col", selectedId ? "flex" : "hidden lg:flex")}>
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
            {chat.lastMessage && (
              <span className="shrink-0 text-caption text-on-surface-variant">{timeLabel(chat.lastMessage.createdAt)}</span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-label text-on-surface-variant">
              {chat.lastMessage?.sender === "bot" ? "AI: " : chat.lastMessage?.sender === "agent" ? "You: " : ""}
              {chat.lastMessage?.body ?? ""}
            </span>
            {chat.waiting && (
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-caption font-semibold text-on-primary">
                Waiting
              </span>
            )}
          </span>
          {site && (
            <span className="mt-0.5 flex items-center gap-1 truncate text-caption text-on-surface-variant">
              <Globe className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{site}</span>
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function Bubble({ m }: { m: WebsiteChatMessage }) {
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
        <p className="whitespace-pre-wrap break-words">{m.body}</p>
        <p className={cn("mt-1 text-right text-caption", m.sender === "agent" ? "text-on-primary/80" : "text-on-surface-variant")}>
          {timeLabel(m.createdAt)}
        </p>
      </div>
    </div>
  );
}

function ChatThread({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
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

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["website-chat", id] });
    void qc.invalidateQueries({ queryKey: ["website-chats"] });
  };

  const send = useMutation({
    mutationFn: (body: string) => replyToWebsiteChat(id, body),
    onSuccess: () => {
      setText("");
      refresh();
    },
    onError: () => toast.error("Couldn't send the reply. Try again."),
  });
  const status = useMutation({
    mutationFn: (s: "open" | "closed") => setWebsiteChatStatus(id, s),
    onSuccess: (_d, s) => {
      toast.success(s === "closed" ? "Chat closed" : "Chat reopened");
      refresh();
    },
    onError: () => toast.error("Couldn't update the chat. Try again."),
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
  const details = [chat.visitorPhone, chat.visitorEmail].filter(Boolean).join(" · ");

  return (
    <>
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
            {details || "No contact details shared"}
            {chat.pageUrl ? ` · from ${chat.pageUrl.replace(/^https?:\/\//, "").slice(0, 60)}` : ""}
          </p>
        </div>
        {chat.status === "open" ? (
          <Button size="sm" variant="secondary" onClick={() => status.mutate("closed")} loading={status.isPending}>
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Close
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => status.mutate("open")} loading={status.isPending}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Reopen
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.map((m) => <Bubble key={m.id} m={m} />)}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex shrink-0 items-end gap-2 border-t border-outline-variant p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 4096))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
          rows={1}
          placeholder="Reply on the website…"
          aria-label="Reply"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body text-on-surface placeholder:text-placeholder outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <Button type="submit" aria-label="Send reply" disabled={!text.trim()} loading={send.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
      <p className="shrink-0 px-4 pb-2 text-caption text-on-surface-variant">
        The visitor sees your reply in the website chat within a few seconds. The AI assistant stays quiet while you reply.
      </p>
    </>
  );
}
