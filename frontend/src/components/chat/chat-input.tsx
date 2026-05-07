"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Paperclip, Smile, Send, X, FileText, Image, Film, Music, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import { CannedResponsePicker } from "./canned-response-picker";
import { InteractiveMessageBuilder } from "./interactive-message-builder";
import type { InteractivePayload } from "@/lib/types/inbox";

export interface MediaAttachment {
  file: File;
  previewUrl?: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  mimeType: string;
}

interface ChatInputProps {
  onSend: (content: string, media?: MediaAttachment) => void;
  onSendInteractive?: (payload: InteractivePayload) => void;
  disabled?: boolean;
  uploading?: boolean;
  channelType?: string | null;
  emailSubject?: string;
  onSubjectChange?: (subject: string) => void;
  maxTextLength?: number;
  prefillText?: string;
  onPrefillApplied?: () => void;
}

function detectMediaType(mimeType: string): MediaAttachment["type"] {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

function MediaIcon({ type }: { type: MediaAttachment["type"] }) {
  switch (type) {
    case "IMAGE":
      return <Image className="h-5 w-5" />;
    case "VIDEO":
      return <Film className="h-5 w-5" />;
    case "AUDIO":
      return <Music className="h-5 w-5" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatInput({ onSend, onSendInteractive, disabled, uploading, channelType, emailSubject, onSubjectChange, maxTextLength, prefillText, onPrefillApplied }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState<MediaAttachment | null>(null);

  // Apply prefilled text from AI suggestions
  useEffect(() => {
    if (prefillText) {
      setValue(prefillText);
      onPrefillApplied?.();
      textareaRef.current?.focus();
    }
  }, [prefillText, onPrefillApplied]);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [showInteractiveBuilder, setShowInteractiveBuilder] = useState(false);
  const [cannedFilter, setCannedFilter] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if ((!trimmed && !attachment) || disabled || uploading) return;
    onSend(trimmed, attachment ?? undefined);
    setValue("");
    setAttachment(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = detectMediaType(file.type);
    const previewUrl = type === "IMAGE" ? URL.createObjectURL(file) : undefined;

    setAttachment({ file, previewUrl, type, mimeType: file.type });

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removeAttachment = () => {
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    setAttachment(null);
  };

  const isOverLimit = maxTextLength ? value.length > maxTextLength : false;
  const canSend = (value.trim() || attachment) && !disabled && !uploading && !isOverLimit;
  const isEmail = channelType === "EMAIL";

  return (
    <div className="shrink-0 border-t border-outline-variant/15 px-4 py-3">
      {/* Interactive message builder */}
      {showInteractiveBuilder && onSendInteractive && (
        <InteractiveMessageBuilder
          onSend={(payload) => {
            onSendInteractive(payload);
            setShowInteractiveBuilder(false);
          }}
          onClose={() => setShowInteractiveBuilder(false)}
        />
      )}

      {/* Email subject line */}
      {isEmail && onSubjectChange && (
        <div className="mb-2">
          <input
            type="text"
            value={emailSubject ?? ""}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Subject..."
            disabled={disabled}
            className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {/* Attachment preview */}
      {attachment && (
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-surface-container px-3 py-2">
          {attachment.previewUrl ? (
            <img
              src={attachment.previewUrl}
              alt="Preview"
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
              <MediaIcon type={attachment.type} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-on-surface truncate font-medium">
              {attachment.file.name}
            </p>
            <p className="text-[11px] text-on-surface-variant">
              {attachment.type} &middot; {formatFileSize(attachment.file.size)}
            </p>
          </div>
          <button
            onClick={removeAttachment}
            className="shrink-0 p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
            title="Remove attachment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="relative flex items-end gap-2 rounded-2xl bg-surface-container px-3 py-2">
        <CannedResponsePicker
          open={showCannedPicker}
          filter={cannedFilter}
          onSelect={(content) => {
            setValue(content);
            setShowCannedPicker(false);
          }}
          onClose={() => setShowCannedPicker(false)}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={handleFileSelect}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className={cn(
            "shrink-0 p-1.5 text-on-surface-variant hover:text-on-surface transition-colors rounded-lg",
            attachment && "text-primary",
          )}
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="shrink-0 p-1.5 text-on-surface-variant hover:text-on-surface transition-colors rounded-lg"
          title="Emoji"
        >
          <Smile className="h-5 w-5" />
        </button>
        {onSendInteractive && (
          <button
            type="button"
            onClick={() => setShowInteractiveBuilder(!showInteractiveBuilder)}
            disabled={disabled || uploading}
            className={cn(
              "shrink-0 p-1.5 transition-colors rounded-lg",
              showInteractiveBuilder
                ? "text-primary bg-primary/10"
                : "text-on-surface-variant hover:text-on-surface",
            )}
            title="Interactive message (buttons / list)"
          >
            <MousePointerClick className="h-5 w-5" />
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            setValue(v);
            if (v.startsWith("/")) {
              setShowCannedPicker(true);
              setCannedFilter(v.slice(1));
            } else {
              setShowCannedPicker(false);
            }
          }}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={attachment ? "Add a caption..." : isEmail ? "Compose email..." : "Type a message..."}
          rows={1}
          disabled={disabled || uploading}
          className="flex-1 resize-none bg-transparent text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none min-h-[24px] max-h-[120px] py-1"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "shrink-0 p-2 rounded-xl transition-colors",
            canSend
              ? "bg-primary text-on-primary hover:bg-primary/90"
              : "text-on-surface-variant/40 cursor-not-allowed",
          )}
          title="Send"
        >
          {uploading ? (
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Character counter */}
      {maxTextLength && value.length > 0 && (
        <div className="flex justify-end mt-1 px-1">
          <span
            className={cn(
              "text-[11px]",
              isOverLimit
                ? "text-error font-medium"
                : value.length > maxTextLength * 0.9
                  ? "text-warning"
                  : "text-on-surface-variant/50",
            )}
          >
            {value.length} / {maxTextLength}
          </span>
        </div>
      )}
    </div>
  );
}
