"use client";

import { fillFields, splitLinks, toParagraphs, SAMPLE_EMAIL_VARS, type EmailVars } from "@/lib/email-render";
import { cn } from "@/lib/utils";

/**
 * What the contact sees in their inbox: sender, subject and the message, with the
 * {{fields}} filled for a sample contact and the unsubscribe footer every email has.
 */
export function EmailPreview({
  fromName,
  fromAddress,
  subject,
  body,
  vars = SAMPLE_EMAIL_VARS,
  className,
}: {
  fromName: string;
  fromAddress?: string | null;
  subject: string;
  body: string;
  vars?: EmailVars;
  className?: string;
}) {
  const filled = { ...vars, company: vars.company ?? fromName };
  const shownSubject = fillFields(subject, filled).trim();
  const paragraphs = toParagraphs(fillFields(body, filled));

  return (
    <figure aria-label="Email preview" className={cn("overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest", className)}>
      <div className="space-y-1 border-b border-outline-variant px-4 py-3">
        <p className="text-label text-on-surface-variant">
          From <span className="font-medium text-on-surface">{fromName || "Your business"}</span>
          {fromAddress ? <span> &lt;{fromAddress}&gt;</span> : null}
        </p>
        <p className="text-label text-on-surface-variant">
          To <span className="text-on-surface">{filled.email || "contact@example.com"}</span>
        </p>
        <p className={cn("text-body-lg font-semibold", shownSubject ? "text-on-surface" : "text-on-surface-variant/60")}>
          {shownSubject || "Subject"}
        </p>
      </div>
      <div className="bg-surface-container px-3 py-4">
        <div className="space-y-3 rounded-xl bg-surface-container-lowest px-4 py-4">
          {paragraphs.length === 0 ? (
            <p className="text-body text-on-surface-variant/60">Your message shows here.</p>
          ) : (
            paragraphs.map((lines, i) => (
              <p key={i} className="whitespace-pre-wrap break-words text-body leading-relaxed text-on-surface">
                {lines.map((line, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {splitLinks(line).map((part, k) =>
                      part.href ? (
                        <span key={k} className="text-primary underline">{part.text}</span>
                      ) : (
                        <span key={k}>{part.text}</span>
                      ),
                    )}
                  </span>
                ))}
              </p>
            ))
          )}
        </div>
        <p className="mt-3 text-center text-caption text-on-surface-variant">
          Sent by {fromName || "your business"} · <span className="underline">Unsubscribe</span>
        </p>
      </div>
      <figcaption className="sr-only">Preview with a sample contact</figcaption>
    </figure>
  );
}
