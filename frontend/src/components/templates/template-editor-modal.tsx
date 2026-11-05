"use client";

import type { ReactNode } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Modal, ModalFooter } from "@/components/ui/modal";

/** Field styles shared with the campaign create modal */
export const TEXTAREA_CLASS =
  "w-full rounded-xl bg-surface-container-low px-4 py-3 text-body text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40 placeholder:text-on-surface-variant/40";
export const LABEL_CLASS = "mb-1.5 block";

/**
 * Languages a template (and Write with AI) can be in — same list for WhatsApp and email.
 * WhatsApp/Meta language codes; keep in step with backend/src/shared/constants/languages.ts.
 * Starter templates stay English; members create or AI-write in any of these.
 */
export const TEMPLATE_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ta", label: "Tamil" },
  { value: "hi", label: "Hindi" },
  { value: "te", label: "Telugu" },
  { value: "kn", label: "Kannada" },
  { value: "ml", label: "Malayalam" },
  { value: "mr", label: "Marathi" },
  { value: "bn", label: "Bengali" },
  { value: "gu", label: "Gujarati" },
  { value: "pa", label: "Punjabi" },
  { value: "ur", label: "Urdu" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "id", label: "Indonesian" },
] as const;

/** Small uppercase heading over a group of fields (as in the campaign modal) */
export function SectionHeading({ icon, label, action }: { icon: ReactNode; label: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex min-h-8 items-center gap-2">
      <span className="text-on-surface-variant/60" aria-hidden>
        {icon}
      </span>
      <p className="text-caption font-semibold uppercase tracking-widest text-on-surface-variant">{label}</p>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

/** The same "Write with AI" button on the WhatsApp and email editors */
export function WriteWithAiButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={onClick} className={className}>
      <Sparkles className="mr-1 h-4 w-4" aria-hidden /> Write with AI
    </Button>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-error/15 bg-error/8 px-3 py-2 text-label text-error">
      {message}
    </p>
  );
}

/**
 * Desktop template editor: a large dialog like "New Campaign": header, form on the
 * left, live preview on the right, Cancel / Save in the footer.
 */
export function TemplateEditorModal({
  open,
  onClose,
  dismissible,
  titleId,
  title,
  icon,
  preview,
  error,
  onSave,
  saving,
  saveLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  dismissible: boolean;
  titleId: string;
  title: string;
  icon: ReactNode;
  /** The live preview (already wrapped in TemplatePreviewPanel) */
  preview: ReactNode;
  error?: string;
  onSave: () => void;
  saving: boolean;
  saveLabel: string;
  /** The form fields */
  children: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={dismissible}
      aria-labelledby={titleId}
      className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden border border-outline-variant/15 xl:max-w-6xl"
    >
      {() => (
        <>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/10 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                {icon}
              </span>
              <h2 id={titleId} className="text-title-sm font-semibold text-on-surface">
                {title}
              </h2>
            </div>
            <IconButton size="sm" onClick={onClose} aria-label="Close" title="Close">
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          <form
            className="flex min-h-0 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
            noValidate
          >
            <div className="flex-1 space-y-6 overflow-y-auto border-r border-outline-variant/10 px-6 py-5">{children}</div>
            <div className="w-[340px] shrink-0 overflow-y-auto bg-surface-container-lowest px-6 py-5 xl:w-[380px]">{preview}</div>
          </form>

          <ModalFooter className="flex shrink-0 items-center justify-between gap-3 border-t border-outline-variant/10 bg-surface-container-lowest px-6 py-4">
            {error ? (
              <p role="alert" className="flex-1 text-label text-error">
                {error}
              </p>
            ) : (
              <span />
            )}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={onSave} disabled={saving} loading={saving}>
                {saveLabel}
              </Button>
            </div>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

/** Small dialog that asks what to write; opened from "Write with AI" */
export function AiWriteModal({
  open,
  onClose,
  titleId,
  title,
  promptId,
  promptLabel,
  placeholder,
  prompt,
  onPromptChange,
  onGenerate,
  pending,
  error,
  hint,
  children,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  promptId: string;
  promptLabel: string;
  placeholder: string;
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
  pending: boolean;
  error?: string;
  hint?: string;
  /** Extra fields under the prompt */
  children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!pending}
      aria-labelledby={titleId}
      // Opens over the editor
      zIndexClassName="z-[60]"
      className="max-w-md border border-outline-variant bg-surface"
    >
      {() => (
        <>
          <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              <h2 id={titleId} className="text-body-lg font-semibold text-on-surface">
                {title}
              </h2>
            </div>
            <IconButton size="xs" onClick={onClose} aria-label="Close" title="Close">
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="space-y-3 p-5">
            <div>
              <label htmlFor={promptId} className="mb-1.5 block text-caption font-medium text-on-surface-variant">
                {promptLabel}
              </label>
              <textarea
                id={promptId}
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder={placeholder}
                maxLength={500}
                rows={3}
                autoFocus
                className="w-full resize-none rounded-lg border border-outline-variant/20 bg-surface-container px-3 py-2.5 text-body text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            {children}
            {hint && <p className="text-caption text-on-surface-variant/50">{hint}</p>}
            <FormError message={error ?? ""} />
          </div>

          <ModalFooter className="flex justify-end gap-2 border-t border-outline-variant px-5 py-4">
            <Button variant="ghost" size="sm" onClick={onClose} className="max-lg:flex-1">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={!prompt.trim() || pending}
              loading={pending}
              className="max-lg:flex-1"
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
              {pending ? "Writing…" : "Write"}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

/** ApiError carries the server's text in `message`; older shapes in response.data.message */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { message?: string; response?: { data?: { message?: string | string[] } } };
  const msg = e?.message || e?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(". ");
  return msg || fallback;
}
