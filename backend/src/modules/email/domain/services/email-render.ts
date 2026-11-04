/**
 * Turning a template into the email a contact receives. No framework or database
 * here, so the same rules drive sending and the preview in the app
 * (frontend/src/lib/email-render.ts mirrors this file — keep them in step).
 */

export interface EmailVars {
  /** Full name, e.g. "Ravi Kumar" */
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  /** The business name the email comes from */
  company?: string | null;
}

/** Fields a template can use */
export const EMAIL_FIELDS = ['name', 'full_name', 'email', 'phone', 'company'] as const;

/**
 * {{name}}, {{ first_name }}… → the contact's values. Like WhatsApp messages,
 * {{name}} is the first name ("there" when unknown); {{full_name}} is the whole name.
 * Unknown fields stay as written; other missing values become "".
 */
export function fillFields(text: string, vars: EmailVars): string {
  const full = (vars.name ?? '').trim();
  const first = full.split(/\s+/)[0] ?? '';
  const values: Record<string, string> = {
    name: first || 'there',
    first_name: first || 'there',
    full_name: full || 'there',
    email: vars.email ?? '',
    phone: vars.phone ?? '',
    company: vars.company ?? '',
  };
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (whole, key: string) => {
    const k = key.toLowerCase();
    return k in values ? values[k] : whole;
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Links in already-escaped text become clickable (http/https only) */
function linkify(escaped: string): string {
  return escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (url) => `<a href="${url}" style="color:#2563eb">${url}</a>`);
}

/**
 * The email body as simple, safe HTML: paragraphs from blank lines, line breaks,
 * clickable links, and a footer with the business name and an unsubscribe link.
 */
export function toEmailHtml(body: string, opts: { business: string; unsubscribeUrl: string }): string {
  const paragraphs = body
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1f2937">${linkify(escapeHtml(p)).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f6f7f9">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="background:#ffffff;border-radius:12px;padding:28px 24px">${paragraphs}</div>
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#6b7280;text-align:center">Sent by ${escapeHtml(opts.business)} ·
<a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#6b7280">Unsubscribe</a></p>
</div></body></html>`;
}

/** The plain-text part (some mail apps show only this) */
export function toEmailText(body: string, opts: { business: string; unsubscribeUrl: string }): string {
  return `${body.trim()}\n\n—\nSent by ${opts.business}. Unsubscribe: ${opts.unsubscribeUrl}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isEmail(value: string | null | undefined): value is string {
  return !!value && value.length <= 320 && EMAIL_RE.test(value.trim());
}

/** Ready-made server details per provider (the setup form fills these in) */
export const SMTP_PRESETS = {
  GMAIL: { host: 'smtp.gmail.com', port: 587, secure: false, dailyLimit: 450 },
  OUTLOOK: { host: 'smtp.office365.com', port: 587, secure: false, dailyLimit: 280 },
  ZOHO: { host: 'smtp.zoho.in', port: 465, secure: true, dailyLimit: 280 },
} as const;
export type EmailProvider = keyof typeof SMTP_PRESETS | 'CUSTOM';
