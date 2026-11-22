"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { usersApi } from "@/lib/api/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const KEY = ["users", "me", "whatsapp", "verification"] as const;
const RESEND_SECONDS = 60;

function apiMessage(err: unknown, fallback: string): string {
  const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) ?? fallback;
}

/**
 * Optional: confirm your WhatsApp number with a 6-digit code Wazelo sends on WhatsApp.
 * Hidden when there's no number yet, it's already verified, or Wazelo can't send codes.
 */
export function WhatsappVerifyCard() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: KEY, queryFn: usersApi.getWhatsappVerification });
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [wait, setWait] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [justVerified, setJustVerified] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = useMutation({
    mutationFn: usersApi.sendWhatsappCode,
    onSuccess: () => {
      setCodeSent(true);
      setWait(RESEND_SECONDS);
      setError(null);
    },
    onError: (err) => setError(apiMessage(err, "Couldn't send the code. Try again in a minute.")),
  });

  const confirm = useMutation({
    mutationFn: () => usersApi.confirmWhatsappCode(code.trim()),
    onSuccess: () => {
      setJustVerified(true);
      queryClient.invalidateQueries({ queryKey: KEY });
    },
    onError: (err) => setError(apiMessage(err, "Couldn't check the code. Try again.")),
  });

  if (justVerified) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-body-lg text-on-surface" role="status">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
        WhatsApp number verified
      </div>
    );
  }
  const s = status.data;
  if (!s || !s.phone || s.verified || !s.available) return null;

  return (
    <section aria-labelledby="wa-verify-title" className="mb-4 rounded-2xl border border-outline-variant bg-surface-container-low p-5 max-lg:p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <MessageCircle className="h-5 w-5 text-primary" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="wa-verify-title" className="text-body-lg font-semibold text-on-surface">Verify your WhatsApp number</h2>
          <p className="text-body text-on-surface-variant">
            We&apos;ll send a code to <span className="font-medium text-on-surface">{s.phone}</span>. Optional.
          </p>

          {codeSent ? (
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                confirm.mutate();
              }}
            >
              <Input
                aria-label="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-32 tracking-[0.3em]"
                autoFocus
              />
              <Button type="submit" loading={confirm.isPending} disabled={code.length !== 6 || confirm.isPending}>
                Verify
              </Button>
              <Button type="button" variant="ghost" disabled={wait > 0 || send.isPending} onClick={() => send.mutate()}>
                {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
              </Button>
            </form>
          ) : (
            <Button type="button" className="mt-3" variant="secondary" loading={send.isPending} onClick={() => send.mutate()}>
              Send code on WhatsApp
            </Button>
          )}

          {error && <p className="mt-2 text-body text-error" role="alert">{error}</p>}
        </div>
      </div>
    </section>
  );
}
