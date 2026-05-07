"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  MessageSquare,
  Megaphone,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useGlobalSearch } from "@/hooks/use-search";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import type { SearchContactResult, SearchConversationResult, SearchCampaignResult } from "@/lib/types/search";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status?.toUpperCase()) {
    case "NEW": return "default";
    case "CONTACTED": return "primary";
    case "QUALIFIED": return "success";
    case "CONVERTED": return "success";
    case "LOST": return "error";
    default: return "default";
  }
}

function campaignStatusColor(status: string) {
  switch (status?.toUpperCase()) {
    case "RUNNING": return "primary";
    case "COMPLETED": return "success";
    case "CANCELLED": return "error";
    default: return "default";
  }
}

function highlight(text: string, query: string) {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Result Sections ──────────────────────────────────────────────────────────

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2">
      <span className="text-on-surface-variant/60">{icon}</span>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/60">{label}</span>
      <span className="ml-auto text-[11px] text-on-surface-variant/40">{count} result{count !== 1 ? "s" : ""}</span>
    </div>
  );
}

function ContactResults({ contacts, query, onNavigate }: {
  contacts: SearchContactResult[];
  query: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <div>
      <SectionHeader icon={<Users className="h-3.5 w-3.5" />} label="Contacts" count={contacts.length} />
      <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest overflow-hidden">
        {contacts.map((c, i) => (
          <button
            key={c.id}
            onClick={() => onNavigate(c.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container/60 transition-colors text-left group ${i < contacts.length - 1 ? "border-b border-outline-variant/8" : ""}`}
          >
            <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-[12px] font-semibold text-primary">
                {(c.name ?? c.phoneNumber).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-on-surface truncate">
                {highlight(c.name ?? "—", query)}
              </p>
              <p className="text-[11px] text-on-surface-variant/60">
                {highlight(c.phoneNumber, query)}
                {c.email && <> · {highlight(c.email, query)}</>}
              </p>
            </div>
            <Badge variant={statusColor(c.leadStatus) as "default" | "primary" | "success" | "error"} className="text-[10px] shrink-0">
              {c.leadStatus}
            </Badge>
            <ArrowRight className="h-3.5 w-3.5 text-on-surface-variant/30 group-hover:text-primary transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ConversationResults({ conversations, query, onNavigate }: {
  conversations: SearchConversationResult[];
  query: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <div>
      <SectionHeader icon={<MessageSquare className="h-3.5 w-3.5" />} label="Conversations" count={conversations.length} />
      <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest overflow-hidden">
        {conversations.map((c, i) => (
          <button
            key={c.id}
            onClick={() => onNavigate(c.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container/60 transition-colors text-left group ${i < conversations.length - 1 ? "border-b border-outline-variant/8" : ""}`}
          >
            <div className="h-8 w-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
              <MessageSquare className="h-3.5 w-3.5 text-on-surface-variant/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-on-surface truncate">
                {highlight(c.contactPhone, query)}
              </p>
              {c.lastMessageBody && (
                <p className="text-[11px] text-on-surface-variant/60 truncate">
                  {c.lastMessageBody}
                </p>
              )}
            </div>
            <Badge variant={c.status === "OPEN" ? "primary" : "default"} className="text-[10px] shrink-0">
              {c.status}
            </Badge>
            <ArrowRight className="h-3.5 w-3.5 text-on-surface-variant/30 group-hover:text-primary transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function CampaignResults({ campaigns, query, onNavigate }: {
  campaigns: SearchCampaignResult[];
  query: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <div>
      <SectionHeader icon={<Megaphone className="h-3.5 w-3.5" />} label="Campaigns" count={campaigns.length} />
      <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest overflow-hidden">
        {campaigns.map((c, i) => (
          <button
            key={c.id}
            onClick={() => onNavigate(c.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container/60 transition-colors text-left group ${i < campaigns.length - 1 ? "border-b border-outline-variant/8" : ""}`}
          >
            <div className="h-8 w-8 rounded-full bg-surface-container flex items-center justify-center shrink-0">
              <Megaphone className="h-3.5 w-3.5 text-on-surface-variant/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-on-surface truncate">
                {highlight(c.name, query)}
              </p>
              <p className="text-[11px] text-on-surface-variant/60">
                {c.totalRecipients.toLocaleString()} recipients
              </p>
            </div>
            <Badge variant={campaignStatusColor(c.status) as "default" | "primary" | "success" | "error"} className="text-[10px] shrink-0">
              {c.status}
            </Badge>
            <ArrowRight className="h-3.5 w-3.5 text-on-surface-variant/30 group-hover:text-primary transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  usePageTitle("Search");
  const router = useRouter();

  const [input, setInput] = useState("");
  const query = useDebounce(input, 350);

  const { data, isFetching, isError } = useGlobalSearch(query);

  const hasResults = data && (
    data.contacts.length > 0 ||
    data.conversations.length > 0 ||
    data.campaigns.length > 0
  );

  const noResults = query.length >= 2 && !isFetching && !hasResults;

  const handleContactClick = useCallback((id: string) => {
    router.push(`/contacts/${id}`);
  }, [router]);

  const handleConversationClick = useCallback((id: string) => {
    router.push(`/inbox?conversationId=${id}`);
  }, [router]);

  const handleCampaignClick = useCallback((id: string) => {
    router.push(`/campaigns/${id}`);
  }, [router]);

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Search className="h-5 w-5 text-primary" />
          <h1 className="text-[18px] font-semibold text-on-surface">Search</h1>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant/50 pointer-events-none" />
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search contacts, conversations, campaigns..."
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface-container border border-outline-variant/20 text-[14px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          />
          {isFetching && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
          )}
        </div>

        {query.length >= 2 && !isFetching && data && (
          <p className="mt-2 text-[12px] text-on-surface-variant/50">
            {(data.contacts.length + data.conversations.length + data.campaigns.length)} result{(data.contacts.length + data.conversations.length + data.campaigns.length) !== 1 ? "s" : ""} for &quot;{query}&quot;
          </p>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
        {/* Idle state */}
        {input.length < 2 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-on-surface-variant/40" />
            </div>
            <p className="text-[15px] font-medium text-on-surface-variant/60 mb-1">
              Search across your CRM
            </p>
            <p className="text-[13px] text-on-surface-variant/40 max-w-xs">
              Find contacts by name, phone or email · conversations · campaigns
            </p>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-xl bg-error/10 border border-error/20 p-4 text-center">
            <p className="text-[13px] text-error">Search failed. Please try again.</p>
          </div>
        )}

        {/* No results */}
        {noResults && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[15px] font-medium text-on-surface-variant/60 mb-1">
              No results for &quot;{query}&quot;
            </p>
            <p className="text-[13px] text-on-surface-variant/40">
              Try a different name, phone number, or keyword
            </p>
          </div>
        )}

        {/* Results */}
        {data && hasResults && (
          <>
            {data.contacts.length > 0 && (
              <ContactResults
                contacts={data.contacts}
                query={query}
                onNavigate={handleContactClick}
              />
            )}
            {data.conversations.length > 0 && (
              <ConversationResults
                conversations={data.conversations}
                query={query}
                onNavigate={handleConversationClick}
              />
            )}
            {data.campaigns.length > 0 && (
              <CampaignResults
                campaigns={data.campaigns}
                query={query}
                onNavigate={handleCampaignClick}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
