import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import type { EmailProvider } from "@/lib/api/email";

/** Server presets the backend fills in; shown read-only so people can check them */
export interface ProviderPreset {
  value: EmailProvider;
  label: string;
  hint: string;
  host?: string;
  port?: number;
  secure?: boolean;
  /** Starting daily limit, kept under the provider's own cap */
  dailyLimit: number;
}

export const EMAIL_PROVIDERS: ProviderPreset[] = [
  { value: "GMAIL", label: "Gmail", hint: "Gmail or Google Workspace", host: "smtp.gmail.com", port: 587, secure: false, dailyLimit: 450 },
  { value: "OUTLOOK", label: "Outlook", hint: "Outlook or Microsoft 365", host: "smtp.office365.com", port: 587, secure: false, dailyLimit: 280 },
  { value: "ZOHO", label: "Zoho", hint: "Zoho Mail (India)", host: "smtp.zoho.in", port: 465, secure: true, dailyLimit: 280 },
  { value: "CUSTOM", label: "Other", hint: "Any SMTP server", dailyLimit: 300 },
];

export function getProvider(value: EmailProvider): ProviderPreset {
  return EMAIL_PROVIDERS.find((p) => p.value === value) ?? EMAIL_PROVIDERS[3];
}

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 rounded font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
    >
      {children}
      <ExternalLink className="h-3 w-3" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

const GUIDES: Record<EmailProvider, { steps: ReactNode[]; note: ReactNode }> = {
  GMAIL: {
    steps: [
      <>Turn on <A href="https://myaccount.google.com/security">2-Step Verification</A></>,
      <>Create an <A href="https://myaccount.google.com/apppasswords">app password</A>, name it “Wazelo”</>,
      <>Paste the 16-letter password here (spaces are fine)</>,
    ],
    note: "Use your Gmail or Google Workspace address.",
  },
  OUTLOOK: {
    steps: [
      <>Turn on two-step verification in your <A href="https://account.microsoft.com/security">Microsoft account security</A></>,
      <>Create an app password</>,
      <>Paste it here</>,
    ],
    note: "Work accounts: your admin may need to allow “Authenticated SMTP”.",
  },
  ZOHO: {
    steps: [
      <>Zoho Mail → Settings → Security → App passwords</>,
      <>Generate one for “Wazelo”</>,
      <>Paste it here</>,
    ],
    note: "For the India data centre (smtp.zoho.in). Other regions: choose Other with smtp.zoho.com.",
  },
  CUSTOM: {
    steps: [
      <>Ask your email host for the SMTP server</>,
      <>Note the port (587 or 465) and your login</>,
      <>Enter them here</>,
    ],
    note: "GoDaddy, Hostinger and cPanel list these under “Email accounts → Connect devices”.",
  },
};

/** Provider-specific setup steps, beside the form on desktop and under it on phones */
export function EmailSettingsGuide({ provider }: { provider: EmailProvider }) {
  const guide = GUIDES[provider];
  return (
    <aside
      data-tour="email-guide"
      aria-labelledby="email-guide-heading"
      className="rounded-2xl bg-surface-container-low p-4 lg:p-5"
    >
      <h2 id="email-guide-heading" className="text-body font-semibold text-on-surface">
        How to ({getProvider(provider).label})
      </h2>
      <ol className="mt-3 space-y-3">
        {guide.steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-body text-on-surface">
            <span
              aria-hidden
              className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-caption font-semibold text-primary"
            >
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-label text-on-surface-variant">{guide.note}</p>
    </aside>
  );
}
