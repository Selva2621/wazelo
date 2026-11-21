"use client";

import Link from "next/link";
import { AlarmClock, ArrowRight, Briefcase, MessageSquare, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { Contact, LeadStatus, PipelineMeta } from "@/lib/types/contacts";

/** A lead sitting this long in an open stage gets the "stale" warning */
const STALE_DAYS = 7;
const OPEN_STAGES: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED"];

/** Message types with no text, in plain words */
const TYPE_LABEL: Record<string, string> = {
  IMAGE: "Photo",
  VIDEO: "Video",
  AUDIO: "Voice message",
  DOCUMENT: "Document",
  STICKER: "Sticker",
  LOCATION: "Location",
  CONTACT: "Contact card",
  REACTION: "Reaction",
  TEMPLATE: "Template",
};

const DAY = 86_400_000;

/** "now", "5m", "3h", "2d", "6w" */
function ago(iso: string, now: number) {
  const ms = now - new Date(iso).getTime();
  if (ms < 60_000) return "now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < DAY) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 14 * DAY) return `${Math.floor(ms / DAY)}d`;
  return `${Math.floor(ms / (7 * DAY))}w`;
}

function followUpText(iso: string, now: number) {
  const ms = new Date(iso).getTime() - now;
  if (ms < 0) return { text: `Follow-up ${ago(iso, now)} late`, overdue: true };
  if (ms < DAY) return { text: "Follow-up today", overdue: false };
  return { text: `Follow-up in ${Math.ceil(ms / DAY)}d`, overdue: false };
}

interface PipelineCardProps {
  contact: Contact;
  meta?: PipelineMeta;
  /** Current time (from the column's useNow), so render stays pure */
  now: number;
  /** Shown in the footer: where the lead came from */
  sourceLabel?: string;
  /** Label of the next column, when there is one */
  nextLabel?: string;
  onNext?: () => void;
  onOpen: (id: string) => void;
  onDragStart: (e: React.DragEvent, contact: Contact) => void;
  onDragEnd?: () => void;
  onConvert?: () => void;
  converting: boolean;
  /** Bulk select: ticked, any card ticked (checkboxes stay visible), toggle */
  selected?: boolean;
  selectMode?: boolean;
  onToggleSelect?: () => void;
}

/**
 * Lead pipeline card, chat first: the last WhatsApp message and whether you owe a reply lead
 * the card; source, score and days in this stage sit in the footer; quick actions show on
 * hover or keyboard focus (always on touch screens).
 */
export function PipelineCard({
  contact,
  meta,
  now,
  sourceLabel,
  nextLabel,
  onNext,
  onOpen,
  onDragStart,
  onDragEnd,
  onConvert,
  converting,
  selected = false,
  selectMode = false,
  onToggleSelect,
}: PipelineCardProps) {
  const name = contact.name || contact.phoneNumber;
  const last = meta?.lastMessage ?? null;
  const waiting = last?.direction === "INBOUND";
  const preview = last ? last.body?.trim() || TYPE_LABEL[last.type] || "Message" : null;
  const daysHere = meta ? Math.floor((now - new Date(meta.stageSince).getTime()) / DAY) : null;
  const stale = daysHere !== null && daysHere >= STALE_DAYS && OPEN_STAGES.includes(contact.leadStatus);
  const followUp = meta?.followUpDueAt ? followUpText(meta.followUpDueAt, now) : null;

  return (
    <li
      draggable
      onDragStart={(e) => onDragStart(e, contact)}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative list-none cursor-grab rounded-xl border bg-surface-container-lowest p-3 transition-colors active:cursor-grabbing",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : waiting
            ? "border-primary/40"
            : "border-outline-variant hover:border-outline",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Avatar, swapped for a checkbox on hover / while selecting */}
        <span className="relative grid size-8 shrink-0 place-items-center">
          <span className={cn("transition-opacity", onToggleSelect && (selectMode || selected) ? "opacity-0" : "group-hover:opacity-0")}>
            <Avatar name={name} src={contact.avatarUrl} size="sm" />
          </span>
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              aria-label={`Select ${name}`}
              className={cn(
                "absolute size-4 cursor-pointer accent-[var(--primary)] transition-opacity focus-visible:opacity-100",
                selectMode || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            />
          )}
        </span>
      {/* Name + reply status: opens the lead */}
      <button
        type="button"
        onClick={() => onOpen(contact.id)}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {/* No saved name (many WhatsApp leads): the number is the useful label */}
        <span className="min-w-0 flex-1 truncate text-body font-medium text-on-surface">{name}</span>
        {last && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-caption font-medium",
              waiting ? "bg-primary/10 text-primary" : "bg-success/10 text-success",
            )}
          >
            <span aria-hidden className={cn("size-1.5 rounded-full", waiting ? "bg-primary" : "bg-success")} />
            {waiting ? "Waiting" : "Replied"}
          </span>
        )}
      </button>
      </div>

      {/* Last message: the main line */}
      {preview ? (
        <p className="mt-2 line-clamp-2 text-label text-on-surface">
          {!waiting && <span className="text-on-surface-variant">You: </span>}
          {preview}
          <span className="ml-1.5 whitespace-nowrap text-caption text-on-surface-variant">· {ago(last!.at, now)}</span>
        </p>
      ) : (
        <p className="mt-2 text-label text-on-surface-variant">{meta ? "No messages yet" : contact.phoneNumber}</p>
      )}

      {/* Footer: source · score · days here · follow-up */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-outline-variant/60 pt-2 text-caption text-on-surface-variant">
        {sourceLabel && <span>{sourceLabel}</span>}
        {contact.leadScore > 0 && (
          <>
            {sourceLabel && <span aria-hidden>·</span>}
            <span>Score {contact.leadScore}</span>
          </>
        )}
        {daysHere !== null && (
          <span
            className={cn("ml-auto inline-flex items-center gap-1", stale && "font-medium text-warning")}
            title={stale ? `No move in ${daysHere} days` : undefined}
          >
            {stale && <TriangleAlert className="h-3 w-3" aria-hidden />}
            {daysHere === 0 ? "Today" : `${daysHere}d here`}
          </span>
        )}
        {followUp && (
          <span
            className={cn(
              "inline-flex w-full items-center gap-1",
              followUp.overdue ? "font-medium text-error" : "text-on-surface-variant",
            )}
          >
            <AlarmClock className="h-3 w-3" aria-hidden />
            {followUp.text}
          </span>
        )}
      </div>

      {/* Quick actions: hover / keyboard focus on desktop, always on touch */}
      {/* Collapsed to no height until hover/focus, so idle cards stay compact */}
      <div
        className={cn(
          "grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-standard",
          "group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100",
          "[@media(hover:none)]:grid-rows-[1fr] [@media(hover:none)]:opacity-100",
        )}
      >
      <div className="flex min-h-0 items-center gap-1.5 overflow-hidden">
        <span aria-hidden className="block h-9 w-0" />
        <Link
          href={`/inbox?phone=${encodeURIComponent(contact.phoneNumber)}`}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-outline-variant px-2 text-caption font-medium text-on-surface outline-none hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-focus"
        >
          <MessageSquare className="h-3 w-3" aria-hidden />
          Chat
        </Link>
        {onConvert && (
          <button
            type="button"
            disabled={converting}
            onClick={onConvert}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-outline-variant px-2 text-caption font-medium text-on-surface outline-none hover:border-primary/40 hover:text-primary disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-focus"
          >
            {converting ? <Spinner size="sm" /> : <Briefcase className="h-3 w-3" aria-hidden />}
            {converting ? "Converting…" : "Deal"}
          </button>
        )}
        {onNext && nextLabel && (
          <button
            type="button"
            onClick={onNext}
            aria-label={`Move ${name} to ${nextLabel}`}
            title={`Move to ${nextLabel}`}
            className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-2 text-caption font-medium text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-focus"
          >
            {nextLabel}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </button>
        )}
      </div>
      </div>
    </li>
  );
}
