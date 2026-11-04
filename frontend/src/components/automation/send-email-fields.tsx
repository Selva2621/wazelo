"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EmailPreview } from "@/components/email/email-preview";
import { useEmailAccount, useEmailTemplates } from "@/hooks/use-email";
import { EMAIL_FIELDS } from "@/lib/email-render";
import { cn } from "@/lib/utils";

export interface SendEmailErrors {
  subject?: string;
  body?: string;
}

/** Subject/message problems of a SEND_EMAIL config — empty when it can be saved */
export function validateSendEmail(config: Record<string, unknown>): SendEmailErrors {
  const errors: SendEmailErrors = {};
  if (!String(config.subject ?? "").trim()) errors.subject = "Add a subject";
  if (!String(config.body ?? "").trim()) errors.body = "Add a message";
  return errors;
}

interface SendEmailFieldsProps {
  subject: string;
  body: string;
  onChange: (patch: { subject?: string; body?: string }) => void;
  /** Trigger-specific chips (e.g. Shopify order fields), inserted as written */
  extraChips?: { label: string; value: string }[];
  errors?: SendEmailErrors;
  /** Field class shared with the editor's other inputs */
  inputClassName: string;
  labelClassName?: string;
}

/** Config for the "Send email" action: template, subject, message, field chips and a preview */
export function SendEmailFields({
  subject,
  body,
  onChange,
  extraChips = [],
  errors = {},
  inputClassName,
  labelClassName,
}: SendEmailFieldsProps) {
  const uid = useId();
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<"subject" | "body">("body");
  const [showPreview, setShowPreview] = useState(false);

  const { data: account, isLoading: accountLoading } = useEmailAccount();
  const { data: templates = [] } = useEmailTemplates();
  const connected = !!account && account.status === "ACTIVE";

  const chips = [
    ...EMAIL_FIELDS.map((f) => ({ label: f.label, value: `{{${f.key}}}` })),
    ...extraChips,
  ];

  function insert(token: string) {
    const which = lastField.current;
    const el = which === "subject" ? subjectRef.current : bodyRef.current;
    const current = which === "subject" ? subject : body;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + token + current.slice(end);
    onChange({ [which]: next });
    // Put the cursor right after the inserted field
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (t) onChange({ subject: t.subject, body: t.body });
  }

  const ids = {
    template: `${uid}-template`,
    subject: `${uid}-subject`,
    body: `${uid}-body`,
    subjectErr: `${uid}-subject-error`,
    bodyErr: `${uid}-body-error`,
    preview: `${uid}-preview`,
  };

  return (
    <div className="space-y-3">
      {!accountLoading && !connected && (
        <p className="flex items-start gap-2 rounded-lg bg-warning-container px-3 py-2 text-caption text-warning" role="status">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <Link
              href="/settings/email"
              className="font-medium underline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Connect your business email in Settings → Email
            </Link>
            {" "}— until then this step is skipped.
          </span>
        </p>
      )}

      {templates.length > 0 && (
        <div>
          <Label htmlFor={ids.template} className={labelClassName}>Use email template</Label>
          <Select
            id={ids.template}
            value=""
            onChange={(e) => applyTemplate(e.target.value)}
            className="mt-1"
          >
            <option value="">— Pick a template —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor={ids.subject} className={labelClassName} required>Subject</Label>
        <input
          id={ids.subject}
          ref={subjectRef}
          value={subject}
          onChange={(e) => onChange({ subject: e.target.value })}
          onFocus={() => { lastField.current = "subject"; }}
          placeholder="Welcome, {{name}}"
          aria-invalid={!!errors.subject}
          aria-describedby={errors.subject ? ids.subjectErr : undefined}
          className={cn(inputClassName, "mt-1", errors.subject && "border-error")}
        />
        {errors.subject && (
          <p id={ids.subjectErr} className="mt-1 text-caption text-error" role="alert">{errors.subject}</p>
        )}
      </div>

      <div>
        <Label htmlFor={ids.body} className={labelClassName} required>Message</Label>
        <textarea
          id={ids.body}
          ref={bodyRef}
          rows={5}
          value={body}
          onChange={(e) => onChange({ body: e.target.value })}
          onFocus={() => { lastField.current = "body"; }}
          placeholder={"Hi {{name}},\n\nThanks for getting in touch with {{company}}."}
          aria-invalid={!!errors.body}
          aria-describedby={errors.body ? ids.bodyErr : undefined}
          className={cn(inputClassName, "mt-1 resize-y", errors.body && "border-error")}
        />
        {errors.body && (
          <p id={ids.bodyErr} className="mt-1 text-caption text-error" role="alert">{errors.body}</p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Insert a field">
          {chips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              // Keep focus (and the cursor) in the field being edited
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(chip.value)}
              className="min-h-7 rounded-md bg-primary/10 px-2 py-0.5 text-caption text-primary outline-none transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-focus max-lg:min-h-11 max-lg:px-3"
            >
              {chip.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-caption text-on-surface-variant">Leave a blank line to start a new paragraph.</p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          aria-expanded={showPreview}
          aria-controls={ids.preview}
          className="flex items-center gap-1 rounded-md text-label font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus max-lg:min-h-11"
        >
          {showPreview ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
          Preview
        </button>
        {showPreview && (
          <div id={ids.preview} className="mt-2">
            <EmailPreview
              fromName={account?.fromName ?? ""}
              fromAddress={account?.fromAddress}
              subject={subject}
              body={body}
            />
          </div>
        )}
      </div>
    </div>
  );
}
