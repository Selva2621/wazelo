"use client";

// Static WhatsApp phone mock-up showing what a contact will receive from a
// campaign or sequence. Reuses the .wa-phone tokens from the auth showcase.

import { Fragment, type ReactNode } from "react";
import {
  ArrowLeft,
  BatteryFull,
  Camera,
  Clock,
  FileText,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Play,
  Signal,
  Smile,
  Video,
  Wifi,
} from "lucide-react";

export interface PhonePreviewMessage {
  key: string | number;
  body: string;
  messageType?: string;
  mediaUrl?: string;
  /** Chip shown above the message, e.g. "After 1 day" */
  gapLabel?: string;
}

interface WhatsAppPhonePreviewProps {
  /** Name shown in the chat header, i.e. the sending business */
  senderName?: string;
  messages: PhonePreviewMessage[];
  className?: string;
}

/** Sample contact the per-contact placeholders are filled with */
const SAMPLE_CONTACT: Record<string, string> = {
  name: "Ravi",
  phone: "+91 98765 43210",
  email: "ravi@example.com",
  leadStatus: "New",
};

function fillSample(body: string): string {
  return body.replace(/\{\{\s*(?:contact\.)?(\w+)\s*\}\}/g, (match, key: string) => SAMPLE_CONTACT[key] ?? match);
}

const FORMAT_RE = /(```[^`]+```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;

/** WhatsApp's *bold*, _italic_, ~strike~ and ```mono``` */
function formatWhatsApp(text: string): ReactNode[] {
  return text.split(FORMAT_RE).map((part, i) => {
    if (part.length > 6 && part.startsWith("```") && part.endsWith("```"))
      return <code key={i} className="font-mono">{part.slice(3, -3)}</code>;
    if (part.length > 2 && part[0] === part[part.length - 1]) {
      const inner = part.slice(1, -1);
      if (part[0] === "*") return <strong key={i} className="font-semibold">{inner}</strong>;
      if (part[0] === "_") return <em key={i}>{inner}</em>;
      if (part[0] === "~") return <s key={i}>{inner}</s>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "W";
}

function MediaBlock({ type, url }: { type: string; url?: string }) {
  if (type === "IMAGE" && url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="aspect-[4/3] w-full rounded-md bg-[var(--wa-chip)] object-cover" />;
  }
  if (type === "DOCUMENT") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-[var(--wa-chip)] px-2 py-2 text-label text-[var(--wa-text)]">
        <FileText className="h-6 w-6 shrink-0 text-[var(--wa-meta)]" />
        <span className="truncate">{url?.split("/").pop() || "Document"}</span>
      </div>
    );
  }
  if (type === "AUDIO") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-[var(--wa-chip)] px-2 py-2">
        <Play className="h-4 w-4 shrink-0 text-[var(--wa-meta)]" />
        <span className="h-1 flex-1 rounded-full bg-[var(--wa-meta)]/40" />
        <span className="text-caption tabular-nums text-[var(--wa-meta)]">0:12</span>
      </div>
    );
  }
  const Icon = type === "VIDEO" ? Play : ImageIcon;
  return (
    <div className="grid aspect-[4/3] w-full place-items-center rounded-md bg-[var(--wa-chip)]">
      <Icon className="h-7 w-7 text-[var(--wa-meta)]" />
    </div>
  );
}

export function WhatsAppPhonePreview({ senderName = "Your business", messages, className }: WhatsAppPhonePreviewProps) {
  const visible = messages.filter((m) => m.body.trim() || (m.messageType && m.messageType !== "TEXT"));

  return (
    <div className={`flex flex-col items-center ${className ?? ""}`}>
      <div className="wa-phone relative" role="img" aria-label="Preview of the message on WhatsApp">
        <span className="absolute -left-[3px] top-28 h-12 w-[3px] rounded-l bg-[var(--wa-frame)]" />
        <span className="absolute -right-[3px] top-24 h-16 w-[3px] rounded-r bg-[var(--wa-frame)]" />

        <div className="rounded-[2.6rem] bg-[var(--wa-frame)] p-[9px] shadow-modal ring-1 ring-white/10">
          <div className="relative flex h-[30.5rem] w-[15.5rem] flex-col overflow-hidden rounded-[2.1rem]">
            {/* status bar */}
            <div className="flex h-7 shrink-0 items-center justify-between bg-[var(--wa-header)] px-5 text-caption font-semibold text-[var(--wa-on-header)]">
              <span className="tabular-nums">9:41</span>
              <span className="absolute left-1/2 top-1.5 h-4 w-16 -translate-x-1/2 rounded-full bg-[var(--wa-frame)]" />
              <span className="flex items-center gap-1">
                <Signal className="h-3 w-3" />
                <Wifi className="h-3 w-3" />
                <BatteryFull className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* chat header */}
            <div className="flex h-12 shrink-0 items-center gap-2 bg-[var(--wa-header)] px-2 text-[var(--wa-on-header)]">
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-label font-semibold text-on-primary">
                {initials(senderName)}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-label font-semibold">{senderName}</p>
                <p className="truncate text-caption font-normal opacity-75">online</p>
              </div>
              <Video className="h-4 w-4 shrink-0" />
              <Phone className="h-4 w-4 shrink-0" />
              <MoreVertical className="h-4 w-4 shrink-0" />
            </div>

            {/* conversation */}
            <div className="wa-wallpaper flex flex-1 flex-col overflow-y-auto px-2.5 py-3">
              <div className="mt-auto flex flex-col gap-1.5">
                <span className="mb-1 self-center rounded-md bg-[var(--wa-chip)] px-2 py-0.5 text-caption font-normal uppercase text-[var(--wa-meta)] shadow-sm">
                  Today
                </span>
                {visible.length === 0 ? (
                  <p className="self-center rounded-md bg-[var(--wa-chip)] px-3 py-1.5 text-center text-caption text-[var(--wa-meta)] shadow-sm">
                    Your message shows up here as you type
                  </p>
                ) : (
                  visible.map((m) => {
                    const type = m.messageType ?? "TEXT";
                    const body = fillSample(m.body);
                    return (
                      <Fragment key={m.key}>
                        {m.gapLabel && (
                          <span className="my-1 inline-flex items-center gap-1 self-center rounded-md bg-[var(--wa-chip)] px-2 py-0.5 text-caption font-normal text-[var(--wa-meta)] shadow-sm">
                            <Clock className="h-3 w-3" />
                            {m.gapLabel}
                          </span>
                        )}
                        <div className="max-w-[88%] self-start overflow-hidden rounded-lg rounded-tl-sm bg-[var(--wa-in)] p-1 shadow-sm">
                          {type !== "TEXT" && <MediaBlock type={type} url={m.mediaUrl} />}
                          {body.trim() && (
                            <p className="whitespace-pre-wrap break-words px-1.5 pt-1 text-label font-normal text-[var(--wa-text)]">
                              {formatWhatsApp(body)}
                            </p>
                          )}
                          <span className="flex justify-end px-1.5 pb-0.5 text-caption text-[var(--wa-meta)]">10:42</span>
                        </div>
                      </Fragment>
                    );
                  })
                )}
              </div>
            </div>

            {/* composer */}
            <div className="flex shrink-0 items-center gap-1.5 bg-[var(--wa-bg)] px-2 pb-2 pt-1">
              <div className="flex h-9 flex-1 items-center gap-2 rounded-full bg-[var(--wa-input)] px-3 text-label font-normal text-[var(--wa-meta)] shadow-sm">
                <Smile className="h-4 w-4 shrink-0" />
                <span className="flex-1">Message</span>
                <Paperclip className="h-4 w-4 shrink-0" />
                <Camera className="h-4 w-4 shrink-0" />
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--wa-accent)] text-white">
                <Mic className="h-4 w-4" />
              </span>
            </div>
            <div className="flex h-4 shrink-0 items-start justify-center bg-[var(--wa-bg)]">
              <span className="h-1 w-20 rounded-full bg-[var(--wa-meta)]/50" />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-caption text-on-surface-variant/60">
        Shown to a sample contact, {SAMPLE_CONTACT.name}
      </p>
    </div>
  );
}
