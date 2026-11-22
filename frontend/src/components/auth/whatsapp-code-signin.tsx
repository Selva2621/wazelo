"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, KeyRound, Mail, MessageCircle } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useWhatsappCodeLogin } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const RESEND_SECONDS = 60;

function message(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * "Sign in with WhatsApp code": email → 6-digit code on the account's verified
 * WhatsApp number → signed in. Works for people who verified their number at
 * onboarding; everyone else uses the password.
 */
export function WhatsappCodeSignin({ onUsePassword }: { onUsePassword: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = useMutation({
    mutationFn: () => authApi.sendWhatsappCode(email.trim()),
    onSuccess: () => {
      setCodeSent(true);
      setWait(RESEND_SECONDS);
    },
  });
  const verify = useWhatsappCodeLogin();

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const error = verify.error
    ? message(verify.error, "Couldn't sign you in. Try again.")
    : send.error
      ? message(send.error, "Couldn't send the code. Try again.")
      : null;

  return (
    <div className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}

      {!codeSent ? (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (emailValid) send.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="wa-email">Email</Label>
            <Input
              id="wa-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              leadingIcon={<Mail />}
              className="h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-label text-on-surface-variant">
              We&apos;ll send a code to the WhatsApp number you verified.
            </p>
          </div>
          <Button type="submit" size="lg" className="w-full" loading={send.isPending} disabled={!emailValid || send.isPending}>
            <MessageCircle className="h-4 w-4" />
            Send code on WhatsApp
          </Button>
        </form>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            verify.mutate({ email: email.trim(), code, rememberMe });
          }}
        >
          <p className="rounded-xl border border-outline-variant bg-surface-container-low p-3 text-body text-on-surface-variant" role="status">
            {send.data?.message ?? "Check WhatsApp for your code."}{" "}
            <button
              type="button"
              className="font-medium text-primary-container underline-offset-4 hover:underline"
              onClick={() => {
                setCodeSent(false);
                setCode("");
                verify.reset();
              }}
            >
              Change email
            </button>
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="wa-code">6-digit code</Label>
            <Input
              id="wa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              leadingIcon={<KeyRound />}
              className="h-11 tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="flex cursor-pointer select-none items-center gap-2 text-body text-on-surface-variant">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded border-outline accent-primary"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <button
              type="button"
              disabled={wait > 0 || send.isPending}
              onClick={() => send.mutate()}
              className="rounded text-body font-medium text-primary-container underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus disabled:text-on-surface-variant disabled:no-underline"
            >
              {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
            </button>
          </div>
          <Button type="submit" size="lg" className="w-full" loading={verify.isPending} disabled={code.length !== 6 || verify.isPending}>
            Sign in
            {!verify.isPending && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      )}

      <button
        type="button"
        onClick={onUsePassword}
        className="w-full rounded text-center text-body font-medium text-on-surface-variant underline-offset-4 outline-none hover:text-on-surface hover:underline focus-visible:ring-2 focus-visible:ring-focus"
      >
        Use your password instead
      </button>
    </div>
  );
}
