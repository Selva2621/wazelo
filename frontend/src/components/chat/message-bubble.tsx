"use client";

import { cn } from "@/lib/utils";
import { Check, CheckCheck, Clock, FileText, Download, List, MousePointerClick } from "lucide-react";

export type MessageDirection = "incoming" | "outgoing";
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";
export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "INTERACTIVE";

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveListRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveListSection {
  title?: string;
  rows: InteractiveListRow[];
}

export interface InteractivePayload {
  type: "button" | "list";
  header?: string;
  body: string;
  footer?: string;
  buttons?: InteractiveButton[];
  sections?: InteractiveListSection[];
  buttonText?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  direction: MessageDirection;
  status: MessageStatus;
  createdAt: string;
  senderName?: string;
  type?: MessageType;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  channelType?: string | null;
  channelPayload?: Record<string, unknown> | null;
  interactivePayload?: InteractivePayload | null;
}

interface MessageBubbleProps {
  message: Message;
}

function StatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case "sending":
      return <Clock className="h-3 w-3 text-on-bubble-out/60" />;
    case "sent":
      return <Check className="h-3 w-3 text-on-bubble-out/60" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-on-bubble-out/60" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-info" />;
    case "failed":
      return <span className="text-caption text-error">Failed</span>;
    default:
      return null;
  }
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MediaContent({ message, isOutgoing }: { message: Message; isOutgoing: boolean }) {
  const { type, mediaUrl } = message;
  if (!mediaUrl || !type || type === "TEXT") return null;

  switch (type) {
    case "IMAGE":
      return (
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={mediaUrl}
            alt="Image"
            className="max-w-full rounded-xl max-h-[300px] object-cover cursor-pointer"
            loading="lazy"
          />
        </a>
      );

    case "VIDEO":
      return (
        <video
          src={mediaUrl}
          controls
          className="max-w-full rounded-xl max-h-[300px]"
          preload="metadata"
        />
      );

    case "AUDIO":
      return (
        <audio src={mediaUrl} controls className="w-full min-w-[200px]" preload="metadata" />
      );

    case "DOCUMENT": {
      const fileName = mediaUrl.split("/").pop() || "Document";
      return (
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
            isOutgoing
              ? "bg-on-bubble-out/10 hover:bg-on-bubble-out/15"
              : "bg-surface-container-high hover:bg-surface-container-highest",
          )}
        >
          <FileText className="h-8 w-8 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-body font-medium truncate">{fileName}</p>
            <p
              className={cn(
                "text-caption",
                isOutgoing ? "text-on-bubble-out/70" : "text-on-surface-variant",
              )}
            >
              {message.mediaMimeType || "Document"}
            </p>
          </div>
          <Download className="h-4 w-4 shrink-0" />
        </a>
      );
    }

    default:
      return null;
  }
}

function InteractiveContent({ message, isOutgoing }: { message: Message; isOutgoing: boolean }) {
  const payload = message.interactivePayload;
  if (!payload) return null;

  if (payload.type === "button" && payload.buttons) {
    return (
      <div className="mt-2 flex flex-col gap-1.5">
        {payload.buttons.map((btn) => (
          <div
            key={btn.id}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-body font-medium border",
              isOutgoing
                ? "border-on-bubble-out/20 text-on-bubble-out"
                : "border-outline-variant text-primary-container",
            )}
          >
            <MousePointerClick className="h-3.5 w-3.5" />
            {btn.title}
          </div>
        ))}
      </div>
    );
  }

  if (payload.type === "list" && payload.sections) {
    return (
      <div className="mt-2">
        <div
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-body font-medium border",
            isOutgoing
              ? "border-on-bubble-out/20 text-on-bubble-out"
              : "border-outline-variant text-primary-container",
          )}
        >
          <List className="h-3.5 w-3.5" />
          {payload.buttonText || "Choose"}
        </div>
        {payload.sections.map((section, si) => (
          <div key={si} className="mt-1.5">
            {section.title && (
              <p
                className={cn(
                  "text-label px-1 mb-0.5",
                  isOutgoing ? "text-on-bubble-out/70" : "text-on-surface-variant",
                )}
              >
                {section.title}
              </p>
            )}
            {section.rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 mb-0.5",
                  isOutgoing ? "bg-on-bubble-out/5" : "bg-surface-container-high/50",
                )}
              >
                <p className="text-body font-medium">{row.title}</p>
                {row.description && (
                  <p
                    className={cn(
                      "text-caption",
                      isOutgoing ? "text-on-bubble-out/70" : "text-on-surface-variant",
                    )}
                  >
                    {row.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutgoing = message.direction === "outgoing";
  const hasMedia = message.type && !["TEXT", "INTERACTIVE"].includes(message.type) && message.mediaUrl;
  const hasText = !!message.content;
  const isInteractive = message.type === "INTERACTIVE" && message.interactivePayload;

  return (
    <div
      className={cn(
        "flex",
        isOutgoing ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] md:max-w-[70%] rounded-2xl overflow-hidden",
          isOutgoing
            ? "bg-bubble-out text-on-bubble-out"
            : "bg-surface-container text-on-surface",
          message.status === "failed" && "border border-error",
          hasMedia && !hasText ? "p-1.5" : hasMedia ? "p-1.5 pb-0" : "px-3.5 py-2",
        )}
      >
        {/* Media */}
        {hasMedia && <MediaContent message={message} isOutgoing={isOutgoing} />}

        {/* Text + timestamp */}
        <div className={cn(hasMedia ? "px-3 py-2" : "")}>
          {/* Email subject line */}
          {message.channelType === "EMAIL" && message.channelPayload?.subject != null && (
            <p className="text-body font-semibold mb-1">
              {String(message.channelPayload.subject)}
            </p>
          )}
          {hasText && (
            <p className="text-body-lg whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          {isInteractive && (
            <InteractiveContent message={message} isOutgoing={isOutgoing} />
          )}
          <div
            className={cn(
              "flex items-center gap-1 mt-1",
              isOutgoing ? "justify-end" : "justify-start",
            )}
          >
            <span
              className={cn(
                "text-caption font-normal tabular-nums",
                isOutgoing ? "text-on-bubble-out/70" : "text-on-surface-variant",
              )}
            >
              {formatMessageTime(message.createdAt)}
            </span>
            {isOutgoing && <StatusIcon status={message.status} />}
          </div>
        </div>
      </div>
    </div>
  );
}
