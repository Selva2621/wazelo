"use client";

import { Mail, MessageCircle } from "lucide-react";
import type { EmailAccount } from "@/lib/api/email";
import { cn } from "@/lib/utils";

export type Channel = "WHATSAPP" | "EMAIL";

/** Email can be sent only from a connected, working business email */
export function isEmailReady(account: EmailAccount | null | undefined): account is EmailAccount {
  return !!account && account.status === "ACTIVE";
}

const CHANNELS: { value: Channel; label: string; icon: typeof Mail }[] = [
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { value: "EMAIL", label: "Email", icon: Mail },
];

/** WhatsApp | Email segmented switch — native radios, so arrow keys work */
export function ChannelSwitch({
  name,
  value,
  onChange,
  label = "Channel",
  className,
  "data-tour": dataTour,
}: {
  name: string;
  value: Channel;
  onChange: (value: Channel) => void;
  label?: string;
  className?: string;
  "data-tour"?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-tour={dataTour}
      className={cn("inline-flex rounded-lg bg-surface-container-low p-0.5", className)}
    >
      {CHANNELS.map(({ value: v, label: text, icon: Icon }) => (
        <label key={v} className="relative">
          <input
            type="radio"
            name={name}
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
            className="peer sr-only"
          />
          <span
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-label font-medium transition-colors max-lg:min-h-11 max-lg:px-4",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-focus",
              value === v
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {text}
          </span>
        </label>
      ))}
    </div>
  );
}

/** Small channel marker next to a campaign name */
export function ChannelIcon({ channel, className }: { channel?: Channel | null; className?: string }) {
  const isEmail = channel === "EMAIL";
  const Icon = isEmail ? Mail : MessageCircle;
  const label = isEmail ? "Email" : "WhatsApp";
  return (
    <span title={label} className={cn("inline-flex shrink-0 text-on-surface-variant", className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Shown in place of the email fields when no working business email is connected */
export function EmailConnectNotice({ account }: { account: EmailAccount | null | undefined }) {
  const needsReconnect = !!account && account.status === "ERROR";
  return (
    <div role="alert" className="rounded-xl bg-warning-container px-4 py-3 text-label text-warning">
      {needsReconnect ? "Your business email needs to be reconnected." : "Connect your business email to send email campaigns."}{" "}
      {/* New tab so the work in progress isn't lost */}
      <a
        href="/settings/email"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded"
      >
        {needsReconnect ? "Reconnect email" : "Connect email"}
      </a>
    </div>
  );
}

/** Insert chips for {{fields}} */
export function FieldChips({
  fields,
  onInsert,
  label = "Insert field",
}: {
  fields: { key: string; label: string }[];
  onInsert: (token: string) => void;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="mt-1 flex flex-wrap gap-1">
      {fields.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onInsert(`{{${f.key}}}`)}
          className="rounded-md border border-outline-variant/20 px-2 py-0.5 text-caption font-medium text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus max-lg:min-h-11 max-lg:px-3"
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

/** Puts a token at the caret of the input with this id (or at the end) and returns the new text */
export function insertAtCursor(elementId: string, current: string, token: string): string {
  const el = document.getElementById(elementId) as HTMLInputElement | HTMLTextAreaElement | null;
  const start = el?.selectionStart ?? current.length;
  const end = el?.selectionEnd ?? current.length;
  const next = current.slice(0, start) + token + current.slice(end);
  if (el) {
    const caret = start + token.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }
  return next;
}
