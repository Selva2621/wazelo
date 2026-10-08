"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import {
  useSAMe,
  useSASetupTwoFactor,
  useSAEnableTwoFactor,
  useSADisableTwoFactor,
} from "@/hooks/use-super-admin";
import { useSuperAdminAuthStore } from "@/stores/super-admin-auth-store";
import type { TwoFactorSetup } from "@/lib/api/super-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

function errorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? fallback;
}

function CodeField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-body-lg font-medium text-on-surface-variant mb-1">
        6-digit code from your authenticator app
      </label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className="max-w-48 tracking-[0.3em] text-center"
      />
    </div>
  );
}

export default function SuperAdminSecurityPage() {
  const { data: me, isLoading } = useSAMe();
  const setProfile = useSuperAdminAuthStore((s) => s.setProfile);
  const setup = useSASetupTwoFactor();
  const enable = useSAEnableTwoFactor();
  const disable = useSADisableTwoFactor();

  const [pending, setPending] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const startSetup = () => {
    setStatus(null);
    setup.mutate(undefined, {
      onSuccess: (data) => {
        setPending(data);
        setCode("");
      },
      onError: (err) => setStatus({ kind: "error", text: errorMessage(err, "Could not start setup") }),
    });
  };

  const confirmEnable = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    enable.mutate(code, {
      onSuccess: (profile) => {
        setProfile(profile);
        setPending(null);
        setCode("");
        setStatus({ kind: "success", text: "Two-factor authentication is on. You'll need a code at every sign-in." });
      },
      onError: (err) => setStatus({ kind: "error", text: errorMessage(err, "Invalid verification code") }),
    });
  };

  const confirmDisable = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    disable.mutate(code, {
      onSuccess: (profile) => {
        setProfile(profile);
        setCode("");
        setStatus({ kind: "success", text: "Two-factor authentication is off." });
      },
      onError: (err) => setStatus({ kind: "error", text: errorMessage(err, "Invalid verification code") }),
    });
  };

  if (isLoading || !me) {
    return (
      <div className="flex justify-center py-12" role="status">
        <Spinner />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <h1 className="text-title font-semibold text-on-surface">Security</h1>

      {status && <Alert variant={status.kind}>{status.text}</Alert>}

      <section
        aria-labelledby="twofa-heading"
        className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-4"
      >
        <div className="flex items-start gap-3">
          {me.twoFactorEnabled ? (
            <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" aria-hidden />
          ) : (
            <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" aria-hidden />
          )}
          <div>
            <h2 id="twofa-heading" className="text-title-sm font-semibold text-on-surface">
              Two-factor authentication — {me.twoFactorEnabled ? "On" : "Off"}
            </h2>
            <p className="text-body text-on-surface-variant mt-1">
              This account can reach every organization. With two-factor on, a stolen password alone
              can't sign in.
            </p>
          </div>
        </div>

        {me.twoFactorEnabled ? (
          <form onSubmit={confirmDisable} className="space-y-3">
            <CodeField id="disable-code" value={code} onChange={setCode} />
            <Button type="submit" variant="destructive" loading={disable.isPending} disabled={code.length !== 6}>
              Turn off two-factor
            </Button>
          </form>
        ) : pending ? (
          <form onSubmit={confirmEnable} className="space-y-4">
            <ol className="list-decimal pl-5 space-y-2 text-body-lg text-on-surface">
              <li>Open Google Authenticator, 1Password, Authy or a similar app.</li>
              <li>Scan this QR code, or enter the key below by hand.</li>
              <li>Enter the 6-digit code the app shows.</li>
            </ol>
            <img
              src={pending.qrCodeDataUrl}
              alt="QR code for adding this account to an authenticator app"
              className="h-44 w-44 rounded-lg bg-white p-2"
            />
            <div>
              <p className="text-body text-on-surface-variant">Setup key</p>
              <code className="block break-all text-body-lg text-on-surface select-all">{pending.secret}</code>
            </div>
            <CodeField id="enable-code" value={code} onChange={setCode} />
            <div className="flex gap-2">
              <Button type="submit" loading={enable.isPending} disabled={code.length !== 6}>
                Turn on two-factor
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPending(null)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={startSetup} loading={setup.isPending}>
            Set up two-factor
          </Button>
        )}
      </section>

      <section
        aria-labelledby="session-heading"
        className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-2"
      >
        <h2 id="session-heading" className="text-title-sm font-semibold text-on-surface">Sessions</h2>
        <p className="text-body text-on-surface-variant">
          Last sign-in: {me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString() : "—"}
        </p>
        <p className="text-body text-on-surface-variant">
          Signing out ends every session for this account, on all devices.
        </p>
      </section>
    </div>
  );
}
