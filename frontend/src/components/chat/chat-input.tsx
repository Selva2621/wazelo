"use client";

import { useState, useRef, useEffect, useCallback, useId, type KeyboardEvent } from "react";
import { Paperclip, Smile, Send, X, FileText, Image, Film, Music, MousePointerClick, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickReplyList, recordQuickReplyUse, useQuickReplyPicker } from "./canned-response-picker";
import { QuickReplyManager } from "./quick-reply-manager";
import type { CannedResponse } from "@/lib/types/canned-responses";
import { InteractiveMessageBuilder } from "./interactive-message-builder";
import { EmojiPicker } from "./emoji-picker";
import type { InteractivePayload } from "@/lib/types/inbox";
import { IconButton } from "@/components/ui/icon-button";

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cannedFilter, setCannedFilter] = useState("");
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickListId = useId();
  const quickPicker = useQuickReplyPicker(showCannedPicker, cannedFilter, quickListId);

  const closeQuickPicker = () => {
    setShowCannedPicker(false);
    setCannedFilter("");
  };

  // "/shortcut" typed alone is replaced; picked from the ⚡ button, it's added to what's typed
  const pickQuickReply = (r: CannedResponse) => {
    setValue((current) => (!current.trim() || current.startsWith("/") ? r.content : `${current.trimEnd()} ${r.content}`));
    recordQuickReplyUse(r);
    closeQuickPicker();
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      handleInput();
    });
  };

  const closeEmojiPicker = useCallback(() => setShowEmojiPicker(false), []);

  // Insert at the caret (or replace the selection) so emojis land where the agent is typing
  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + emoji + value.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
      handleInput();
    });
  };

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
    // The quick-reply list gets the keys first: Enter picks instead of sending "/shortcut"
    if (quickPicker.handleKey(e, pickQuickReply, closeQuickPicker)) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 132) + "px";
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
    <div className="shrink-0 border-t border-outline-variant bg-surface-container-lowest px-4 py-3">
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
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 text-body-lg text-on-surface placeholder:text-placeholder outline-none hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/30"
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
            <p className="text-body text-on-surface truncate font-medium">
              {attachment.file.name}
            </p>
            <p className="text-caption font-normal text-on-surface-variant">
              {attachment.type} &middot; {formatFileSize(attachment.file.size)}
            </p>
          </div>
          <IconButton size="xs" variant="danger"
            onClick={removeAttachment}
           
            title="Remove attachment" aria-label="Remove attachment">
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      )}

      {/* Input row */}
      <div className="relative flex items-end gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 transition-[border-color,box-shadow] duration-120 ease-standard focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
        {showCannedPicker && (
          <QuickReplyList
            listboxId={quickListId}
            filter={cannedFilter}
            picker={quickPicker}
            onPick={pickQuickReply}
            onManage={() => {
              closeQuickPicker();
              setQuickRepliesOpen(true);
            }}
          />
        )}
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
            attachment && "text-primary-container",
          )}
          title="Attach file"
          aria-label="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={insertEmoji}
            onClose={closeEmojiPicker}
          />
        )}
        <IconButton size="sm"
          type="button"
          data-emoji-trigger
          onClick={() => setShowEmojiPicker((o) => !o)}
          disabled={disabled || uploading}
          aria-expanded={showEmojiPicker}
          className={cn(showEmojiPicker && "text-primary bg-primary/10")}
          title="Emoji" aria-label="Emoji">
          <Smile className="h-5 w-5" />
        </IconButton>
        <IconButton size="sm"
          type="button"
          // Keep focus in the message box, so its blur doesn't close the list first
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (showCannedPicker) return closeQuickPicker();
            setCannedFilter("");
            setShowCannedPicker(true);
            textareaRef.current?.focus();
          }}
          disabled={disabled || uploading}
          aria-expanded={showCannedPicker}
          aria-controls={showCannedPicker ? quickListId : undefined}
          className={cn(showCannedPicker && "text-primary bg-primary/10")}
          title="Quick replies (or type /)" aria-label="Quick replies">
          <Zap className="h-5 w-5" />
        </IconButton>
        {onSendInteractive && (
          <button
            type="button"
            onClick={() => setShowInteractiveBuilder(!showInteractiveBuilder)}
            disabled={disabled || uploading}
            className={cn(
              "shrink-0 p-1.5 transition-colors rounded-lg",
              showInteractiveBuilder
                ? "text-primary-container bg-primary/10"
                : "text-on-surface-variant hover:text-on-surface",
            )}
            title="Interactive message (buttons / list)"
            aria-label="Interactive message"
            aria-pressed={showInteractiveBuilder}
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
            } else if (showCannedPicker) {
              closeQuickPicker();
            }
          }}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onBlur={() => showCannedPicker && closeQuickPicker()}
          role="combobox"
          aria-label="Message"
          aria-autocomplete="list"
          aria-expanded={showCannedPicker}
          aria-controls={showCannedPicker ? quickListId : undefined}
          aria-activedescendant={quickPicker.activeId}
          placeholder={attachment ? "Add a caption..." : isEmail ? "Compose email..." : "Type a message, or / for quick replies"}
          rows={1}
          disabled={disabled || uploading}
          className="flex-1 resize-none bg-transparent text-body-lg text-on-surface placeholder:text-placeholder outline-none min-h-[24px] max-h-[132px] py-1"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "shrink-0 p-2 rounded-lg transition-colors duration-120 ease-standard",
            canSend
              ? "bg-primary text-on-primary hover:bg-primary-container"
              : "text-on-surface-variant opacity-50 cursor-not-allowed",
          )}
          title="Send"
          aria-label="Send message"
        >
          {uploading ? (
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      <QuickReplyManager open={quickRepliesOpen} onClose={() => setQuickRepliesOpen(false)} />

      {/* Character counter */}
      {maxTextLength && value.length > 0 && (
        <div className="flex justify-end mt-1 px-1">
          <span
            className={cn(
              "text-caption font-normal tabular-nums",
              isOverLimit
                ? "text-error font-medium"
                : value.length > maxTextLength * 0.9
                  ? "text-warning"
                  : "text-on-surface-variant",
            )}
          >
            {value.length} / {maxTextLength}
          </span>
        </div>
      )}
    </div>
  );
}
