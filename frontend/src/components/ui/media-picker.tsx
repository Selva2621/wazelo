"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FileText, Film, Music, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadApi } from "@/lib/api/messages";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";

export type MediaKind = "image" | "video" | "audio" | "document" | "any";

/** What a WhatsApp message type accepts */
export function mediaKindFor(messageType: string): MediaKind {
  const map: Record<string, MediaKind> = { IMAGE: "image", VIDEO: "video", DOCUMENT: "document", AUDIO: "audio" };
  return map[messageType] ?? "any";
}

const ACCEPT: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/webm,video/3gpp,video/mpeg",
  audio: "audio/mpeg,audio/ogg,audio/wav,audio/aac,audio/webm",
  document:
    "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv",
  any: "image/*,video/*,audio/*,application/pdf,text/plain,text/csv",
};

/** Matches the server's raw upload cap; images and videos are compressed below 16 MB */
const MAX_PICK_BYTES = 100 * 1024 * 1024;
const MAX_PLAIN_BYTES = 16 * 1024 * 1024;

export interface PickedMedia {
  mimeType: string;
  name: string;
}

interface UploadedInfo extends PickedMedia {
  size: number;
  originalSize?: number;
}

interface MediaPickerProps {
  id?: string;
  value: string;
  onChange: (url: string, media?: PickedMedia) => void;
  /** Limits the file picker */
  kind?: MediaKind;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function errorText(err: unknown) {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg[0];
  return msg || (err as Error)?.message || "Upload failed";
}

function kindOf(mimeType: string | undefined, url: string): MediaKind {
  const t = mimeType ?? "";
  if (t.startsWith("image/") || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) return "image";
  if (t.startsWith("video/") || /\.(mp4|webm|3gpp?|mpeg)(\?|$)/i.test(url)) return "video";
  if (t.startsWith("audio/") || /\.(mp3|ogg|wav|aac)(\?|$)/i.test(url)) return "audio";
  return "document";
}

/**
 * Pick media from the computer (drag-and-drop or browse) or paste a link.
 * Uploads go to /upload, where images and videos are compressed for WhatsApp.
 */
export function MediaPicker({ id, value, onChange, kind = "any", error, disabled, className }: MediaPickerProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState("");
  const [info, setInfo] = useState<UploadedInfo | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploading = progress !== null;
  const shownError = uploadError ?? error;

  async function upload(file: File) {
    setUploadError(null);
    const compressible = file.type.startsWith("image/") || file.type.startsWith("video/");
    if (file.size > (compressible ? MAX_PICK_BYTES : MAX_PLAIN_BYTES)) {
      setUploadError(`${file.name} is ${formatBytes(file.size)}. The limit is ${compressible ? "100" : "16"} MB.`);
      return;
    }
    setUploadingName(file.name);
    setProgress(0);
    try {
      const res = await uploadApi.uploadFile(file, setProgress);
      const media = { mimeType: res.mimeType, name: file.name };
      setInfo({ ...media, size: res.size, originalSize: res.compressed ? res.originalSize : undefined });
      onChange(res.url, media);
    } catch (err) {
      setUploadError(errorText(err));
    } finally {
      setProgress(null);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  function clear() {
    setInfo(null);
    setUploadError(null);
    onChange("");
  }

  const switchLink = (label: string, to: "upload" | "url") => (
    <button
      type="button"
      disabled={disabled || uploading}
      onClick={() => {
        setMode(to);
        setUploadError(null);
      }}
      className="mt-1.5 text-label font-medium text-primary hover:underline disabled:opacity-50"
    >
      {label}
    </button>
  );

  /* ── Paste a link ── */
  if (mode === "url") {
    return (
      <div className={cn("mt-1", className)}>
        <Input
          id={inputId}
          type="url"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setInfo(null);
            onChange(e.target.value);
          }}
          placeholder="https://example.com/file.jpg"
          error={shownError}
        />
        {switchLink("Upload from computer instead", "upload")}
      </div>
    );
  }

  /* ── Uploading ── */
  if (uploading) {
    const sending = (progress ?? 0) < 100;
    return (
      <div className={cn("mt-1 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3", className)}>
        <div className="flex items-center justify-between gap-3 text-label">
          <span className="min-w-0 truncate font-medium text-on-surface">{uploadingName}</span>
          <span className="shrink-0 tabular-nums text-on-surface-variant" aria-live="polite">
            {sending ? `${progress}%` : "Compressing…"}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-outline-variant/30">
          <div
            className={cn("h-full rounded-full bg-primary transition-[width] duration-200", !sending && "animate-pulse")}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  /* ── Picked: preview ── */
  if (value) {
    const k = kindOf(info?.mimeType, value);
    const name = info?.name ?? decodeURIComponent(value.split("?")[0].split("/").pop() || "File");
    const Icon = k === "video" ? Film : k === "audio" ? Music : FileText;
    return (
      <div className={cn("mt-1", className)}>
        <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-2.5">
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-container">
            {k === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon className="h-5 w-5 text-on-surface-variant" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-medium text-on-surface">{name}</p>
            {info && (
              <p className="text-caption text-on-surface-variant tabular-nums">
                {info.originalSize ? (
                  <>
                    {formatBytes(info.originalSize)} → <span className="font-medium text-success">{formatBytes(info.size)}</span>
                  </>
                ) : (
                  formatBytes(info.size)
                )}
              </p>
            )}
          </div>
          <IconButton size="sm" variant="danger" type="button" onClick={clear} disabled={disabled} aria-label="Remove file">
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        {shownError && <p className="mt-1.5 text-caption text-error" role="alert">{shownError}</p>}
      </div>
    );
  }

  /* ── Empty: drop zone ── */
  const compresses = kind === "image" || kind === "video" || kind === "any";
  return (
    <div className={cn("mt-1", className)}>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT[kind]}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-outline-variant bg-surface-container-low",
          shownError && !dragging && "border-error/60",
          disabled && "opacity-50",
        )}
      >
        <Upload className={cn("h-5 w-5", dragging ? "text-primary" : "text-on-surface-variant")} aria-hidden />
        <p className="text-body text-on-surface">
          Drop a file here or{" "}
          <button
            id={inputId}
            type="button"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            className="font-semibold text-primary hover:underline disabled:no-underline"
          >
            browse
          </button>
        </p>
        {compresses && <p className="text-caption text-on-surface-variant">Images and videos are compressed for WhatsApp</p>}
      </div>
      {shownError && <p className="mt-1.5 text-caption text-error" role="alert">{shownError}</p>}
      {switchLink("or paste a URL", "url")}
    </div>
  );
}
