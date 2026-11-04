/**
 * How an email template turns into what the contact receives — the same rules as
 * the backend (backend/src/modules/email/domain/services/email-render.ts; keep
 * them in step), so the preview shows exactly what is sent.
 */

export interface EmailVars {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
}

/** Fields a template can use, for the insert chips */
export const EMAIL_FIELDS: { key: string; label: string }[] = [
  { key: "name", label: "First name" },
  { key: "full_name", label: "Full name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Your business" },
];

/** A sample contact for previews */
export const SAMPLE_EMAIL_VARS: EmailVars = { name: "Ravi Kumar", email: "ravi@example.com", phone: "+91 98765 43210" };

/** {{name}} = first name ("there" when unknown), like WhatsApp messages; unknown fields stay as written */
export function fillFields(text: string, vars: EmailVars): string {
  const full = (vars.name ?? "").trim();
  const first = full.split(/\s+/)[0] ?? "";
  const values: Record<string, string> = {
    name: first || "there",
    first_name: first || "there",
    full_name: full || "there",
    email: vars.email ?? "",
    phone: vars.phone ?? "",
    company: vars.company ?? "",
  };
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (whole, key: string) => {
    const k = key.toLowerCase();
    return k in values ? values[k] : whole;
  });
}

/** The body as paragraphs (blank lines) with line breaks, for the preview */
export function toParagraphs(body: string): string[][] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.split("\n"));
}

/** Splits a line into text and http(s) links, so the preview can show links like the email does */
export function splitLinks(line: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  const re = /\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g;
  let last = 0;
  for (const m of line.matchAll(re)) {
    if (m.index! > last) parts.push({ text: line.slice(last, m.index) });
    parts.push({ text: m[0], href: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last) });
  return parts;
}
