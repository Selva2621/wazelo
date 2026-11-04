"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ChevronRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSaveEmailAccount, useSendTestEmail } from "@/hooks/use-email";
import type { EmailAccount, EmailProvider, SaveEmailAccountInput } from "@/lib/api/email";
import { cn } from "@/lib/utils";
import { EMAIL_PROVIDERS, EmailSettingsGuide, getProvider } from "./email-settings-guide";

/** Plain-language message from an axios error (message may be a string or a list) */
export function emailErrorText(err: unknown, fallback: string): string {
  // The API client turns server errors into ApiError (message = the server's text)
  const e = err as { message?: unknown; response?: { data?: { message?: unknown } } };
  const msg = e?.response?.data?.message ?? e?.message;
  if (Array.isArray(msg)) return msg.filter((m) => typeof m === "string").join(" ") || fallback;
  if (typeof msg === "string" && msg.trim()) return msg;
  return fallback;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const fieldCls = "max-lg:h-11";
const labelCls = "mb-1 block text-label font-medium text-on-surface-variant";

type Errors = Partial<Record<"fromName" | "fromAddress" | "password" | "host" | "port" | "dailyLimit" | "replyTo", string>>;

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StepTitle({ n, children }: { n: number; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-body font-semibold text-on-surface">
      <span aria-hidden className="grid size-6 place-items-center rounded-full bg-primary text-caption font-semibold text-on-primary">
        {n}
      </span>
      {children}
    </h2>
  );
}

interface Props {
  /** The saved account when editing; null for a first connection */
  account: EmailAccount | null;
  /** Called after a successful save (the test email may still have failed) */
  onDone: () => void;
  onCancel?: () => void;
}

/** Step 1 pick the provider, step 2 the short form + setup guide, then save and send a test */
export function EmailSettingsForm({ account, onDone, onCancel }: Props) {
  const save = useSaveEmailAccount();
  const sendTest = useSendTestEmail();

  const [provider, setProvider] = useState<EmailProvider>(account?.provider ?? "GMAIL");
  const [fromName, setFromName] = useState(account?.fromName ?? "");
  const [fromAddress, setFromAddress] = useState(account?.fromAddress ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [host, setHost] = useState(account?.provider === "CUSTOM" ? account.host : "");
  const [port, setPort] = useState(account?.provider === "CUSTOM" ? String(account.port) : "587");
  const [secure, setSecure] = useState(account?.provider === "CUSTOM" ? account.secure : false);
  const [username, setUsername] = useState(account?.provider === "CUSTOM" ? account.username : "");
  const [replyTo, setReplyTo] = useState(account?.replyTo ?? "");
  const [dailyLimit, setDailyLimit] = useState(String(account?.dailyLimit ?? getProvider("GMAIL").dailyLimit));
  const [limitTouched, setLimitTouched] = useState(!!account);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const preset = getProvider(provider);
  const isCustom = provider === "CUSTOM";
  const busy = save.isPending || sendTest.isPending;

  const pickProvider = (p: EmailProvider) => {
    setProvider(p);
    setServerError(null);
    if (!limitTouched) setDailyLimit(String(getProvider(p).dailyLimit));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!fromName.trim()) e.fromName = "Enter the name people will see.";
    if (!EMAIL_RE.test(fromAddress.trim())) e.fromAddress = "Enter a valid email address.";
    if (!account && !password.trim()) e.password = isCustom ? "Enter your password." : "Paste your app password.";
    if (replyTo.trim() && !EMAIL_RE.test(replyTo.trim())) e.replyTo = "Enter a valid email address.";
    const limit = Number(dailyLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 5000) e.dailyLimit = "Use a number from 1 to 5000.";
    if (isCustom) {
      if (!host.trim()) e.host = "Enter the SMTP server.";
      const p = Number(port);
      if (!Number.isInteger(p) || p < 1 || p > 65535) e.port = "Enter a port, usually 587 or 465.";
    }
    return e;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    // App passwords are shown in groups of four; the spaces aren't part of them
    const pw = provider === "GMAIL" ? password.replace(/\s+/g, "") : password;
    const input: SaveEmailAccountInput = {
      provider,
      fromName: fromName.trim(),
      fromAddress: fromAddress.trim(),
      dailyLimit: Number(dailyLimit),
      ...(pw ? { password: pw } : {}),
      ...(replyTo.trim() ? { replyTo: replyTo.trim() } : {}),
      ...(isCustom
        ? { host: host.trim(), port: Number(port), secure, username: username.trim() || fromAddress.trim() }
        : {}),
    };

    try {
      await save.mutateAsync(input);
    } catch (err) {
      setServerError(emailErrorText(err, "Couldn't sign in to your mail server. Check the details and try again."));
      return;
    }
    try {
      const { sentTo } = await sendTest.mutateAsync(undefined);
      toast.success(`Connected. Test email sent to ${sentTo}`);
    } catch (err) {
      toast.error(emailErrorText(err, "Saved, but the test email didn't send."));
    }
    onDone();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Step 1: provider */}
      <section aria-labelledby="email-step-1" className="space-y-3">
        <StepTitle n={1}>
          <span id="email-step-1">Choose your email</span>
        </StepTitle>
        <div
          data-tour="email-provider"
          role="radiogroup"
          aria-labelledby="email-step-1"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {EMAIL_PROVIDERS.map((p) => (
            <label key={p.value} className="relative cursor-pointer">
              <input
                type="radio"
                name="email-provider"
                value={p.value}
                checked={provider === p.value}
                onChange={() => pickProvider(p.value)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex min-h-16 flex-col justify-center rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5 transition-colors",
                  "hover:border-outline peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:ring-1 peer-checked:ring-primary",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-focus",
                )}
              >
                <span className="text-body-lg font-medium text-on-surface">{p.label}</span>
                <span className="text-caption text-on-surface-variant">{p.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Step 2: form + guide */}
      <section aria-labelledby="email-step-2" className="space-y-3">
        <StepTitle n={2}>
          <span id="email-step-2">Connect</span>
        </StepTitle>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div data-tour="email-form" className="space-y-4">
            <Field id="email-from-name" label="From name">
              <Input
                id="email-from-name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Kavya Boutique"
                autoComplete="organization"
                error={errors.fromName}
                className={fieldCls}
              />
            </Field>
            <Field id="email-from-address" label="Email">
              <Input
                id="email-from-address"
                type="email"
                inputMode="email"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                placeholder="hello@kavya.in"
                autoComplete="email"
                error={errors.fromAddress}
                className={fieldCls}
              />
            </Field>
            <Field id="email-password" label={isCustom ? "Password" : "App password"}>
              <div className="relative">
                <Input
                  id="email-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={account ? "Leave blank to keep the saved one" : isCustom ? "" : "•••• •••• •••• ••••"}
                  autoComplete="new-password"
                  error={errors.password}
                  className={cn(fieldCls, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-0 grid h-10 w-10 place-items-center rounded-lg text-on-surface-variant outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus max-lg:h-11 max-lg:w-11"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </Field>

            {isCustom && (
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
                <Field id="email-host" label="SMTP server">
                  <Input
                    id="email-host"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="smtp.yourhost.com"
                    autoCapitalize="none"
                    spellCheck={false}
                    error={errors.host}
                    className={fieldCls}
                  />
                </Field>
                <Field id="email-port" label="Port">
                  <Input
                    id="email-port"
                    inputMode="numeric"
                    value={port}
                    onChange={(e) => {
                      setPort(e.target.value);
                      if (e.target.value === "465") setSecure(true);
                      if (e.target.value === "587") setSecure(false);
                    }}
                    placeholder="587"
                    error={errors.port}
                    className={fieldCls}
                  />
                </Field>
                <Field id="email-username" label="Login (if not your email)">
                  <Input
                    id="email-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={fromAddress || "Same as email"}
                    autoCapitalize="none"
                    autoComplete="username"
                    spellCheck={false}
                    className={fieldCls}
                  />
                </Field>
                <div className="flex min-h-11 items-center justify-between gap-3 sm:col-span-2">
                  <span id="email-secure-label" className="text-body text-on-surface">
                    SSL (port 465)
                  </span>
                  <Switch checked={secure} onChange={setSecure} aria-labelledby="email-secure-label" />
                </div>
              </div>
            )}

            <details className="group rounded-xl border border-outline-variant">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 text-body font-medium text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-focus [&::-webkit-details-marker]:hidden">
                <ChevronRight className="h-4 w-4 text-on-surface-variant transition-transform group-open:rotate-90" aria-hidden />
                {isCustom ? "More settings" : "Server details"}
                {!isCustom && <span className="ml-1 text-caption font-normal text-on-surface-variant">(filled)</span>}
              </summary>
              <div className="space-y-4 border-t border-outline-variant px-3 py-3">
                {!isCustom && (
                  <p className="text-label text-on-surface-variant">
                    {preset.host}:{preset.port} · {preset.secure ? "SSL" : "STARTTLS"}
                  </p>
                )}
                <Field id="email-reply-to" label="Reply-to (optional)">
                  <Input
                    id="email-reply-to"
                    type="email"
                    inputMode="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="Same as email"
                    error={errors.replyTo}
                    className={fieldCls}
                  />
                </Field>
                <Field id="email-daily-limit" label="Daily limit">
                  <Input
                    id="email-daily-limit"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={5000}
                    value={dailyLimit}
                    onChange={(e) => {
                      setDailyLimit(e.target.value);
                      setLimitTouched(true);
                    }}
                    error={errors.dailyLimit}
                    aria-describedby={errors.dailyLimit ? undefined : "email-daily-limit-hint"}
                    className={cn(fieldCls, "max-w-40")}
                  />
                  {!errors.dailyLimit && (
                    <p id="email-daily-limit-hint" className="mt-1.5 text-caption text-on-surface-variant">
                      At the limit, sending pauses and resumes tomorrow.
                    </p>
                  )}
                </Field>
              </div>
            </details>

            {serverError && (
              <p role="alert" className="rounded-xl bg-error-container px-3 py-2.5 text-body text-error">
                {serverError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 max-lg:flex-col max-lg:items-stretch">
              <Button type="submit" loading={busy} className="max-lg:h-11">
                {save.isPending ? "Checking…" : sendTest.isPending ? "Sending test…" : "Save & send test email"}
              </Button>
              {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel} disabled={busy} className="max-lg:h-11">
                  Cancel
                </Button>
              )}
            </div>
          </div>

          <EmailSettingsGuide provider={provider} />
        </div>
      </section>
    </form>
  );
}
