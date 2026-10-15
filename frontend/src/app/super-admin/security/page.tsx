"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldAlert, Monitor, KeyRound } from "lucide-react";
import {
  useSAMe,
  useSASetupTwoFactor,
  useSAEnableTwoFactor,
  useSADisableTwoFactor,
  useSARegenerateRecoveryCodes,
  useSASessions,
  useSARevokeSession,
  useSALogoutAll,
  useSAChangePassword,
} from "@/hooks/use-super-admin";
import { useSuperAdminAuthStore } from "@/stores/super-admin-auth-store";
import type { SuperAdminActiveSession, TwoFactorSetup } from "@/lib/api/super-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RecoveryCodesPanel } from "@/components/super-admin/recovery-codes-panel";
import { NewPasswordFields, isNewPasswordValid } from "@/components/super-admin/new-password-fields";

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

/** "Chrome on Windows" from a user agent string; good enough to tell devices apart. */
function describeDevice(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /OPR\//.test(ua) ? "Opera" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Browser";
  const os =
    /Windows/.test(ua) ? "Windows" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad/.test(ua) ? "iOS" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Linux/.test(ua) ? "Linux" : "unknown OS";
  return `${browser} on ${os}`;
}

const sectionClass = "bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-4";

function PasswordSection() {
  const changePassword = useSAChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const valid = current.length > 0 && isNewPasswordValid(next, confirm);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    changePassword.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: ({ otherSessionsSignedOut }) => {
          setCurrent("");
          setNext("");
          setConfirm("");
          toast.success(
            otherSessionsSignedOut > 0
              ? `Password changed. ${otherSessionsSignedOut === 1 ? "1 other device was" : `${otherSessionsSignedOut} other devices were`} signed out.`
              : "Password changed",
          );
        },
        onError: (err) => setError(errorMessage(err, "Could not change your password")),
      },
    );
  };

  return (
    <section aria-labelledby="password-heading" className={sectionClass}>
      <div className="flex items-start gap-3">
        <KeyRound className="h-5 w-5 text-on-surface-variant shrink-0 mt-0.5" aria-hidden />
        <div>
          <h2 id="password-heading" className="text-title-sm font-semibold text-on-surface">Password</h2>
          <p className="text-body text-on-surface-variant mt-1">
            Changing it signs out your other devices. This one stays signed in.
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4 max-w-sm" noValidate>
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <label htmlFor="current-password" className="block text-body-lg font-medium text-on-surface-variant mb-1">
            Current password
          </label>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <NewPasswordFields
          idPrefix="change-password"
          newPassword={next}
          confirm={confirm}
          onNewPasswordChange={setNext}
          onConfirmChange={setConfirm}
        />
        <Button type="submit" loading={changePassword.isPending} disabled={!valid}>
          Change password
        </Button>
      </form>
    </section>
  );
}

export default function SuperAdminSecurityPage() {
  const router = useRouter();
  const { data: me, isLoading, isError } = useSAMe();
  const setProfile = useSuperAdminAuthStore((s) => s.setProfile);
  const clearAuth = useSuperAdminAuthStore((s) => s.clearAuth);
  const setup = useSASetupTwoFactor();
  const enable = useSAEnableTwoFactor();
  const disable = useSADisableTwoFactor();
  const regenerate = useSARegenerateRecoveryCodes();
  const sessions = useSASessions();
  const revoke = useSARevokeSession();
  const logoutAll = useSALogoutAll();

  const [pending, setPending] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState("");
  const [regenCode, setRegenCode] = useState("");
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<SuperAdminActiveSession | null>(null);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);

  const startSetup = () => {
    setup.mutate(undefined, {
      onSuccess: (data) => {
        setPending(data);
        setCode("");
      },
      onError: (err) => toast.error(errorMessage(err, "Could not start setup")),
    });
  };

  const confirmEnable = (e: React.FormEvent) => {
    e.preventDefault();
    enable.mutate(code, {
      onSuccess: ({ recoveryCodes, ...profile }) => {
        setProfile(profile);
        setPending(null);
        setCode("");
        setNewCodes(recoveryCodes);
        toast.success("Two-factor authentication is on. Other devices were signed out.");
      },
      onError: (err) => toast.error(errorMessage(err, "Invalid verification code")),
    });
  };

  const confirmDisable = (e: React.FormEvent) => {
    e.preventDefault();
    disable.mutate(code, {
      onSuccess: (profile) => {
        setProfile(profile);
        setCode("");
        toast.success("Two-factor authentication is off.");
      },
      onError: (err) => toast.error(errorMessage(err, "Invalid verification code")),
    });
  };

  const confirmRegenerate = (e: React.FormEvent) => {
    e.preventDefault();
    regenerate.mutate(regenCode, {
      onSuccess: ({ recoveryCodes }) => {
        setRegenCode("");
        setNewCodes(recoveryCodes);
        toast.success("New recovery codes created. The old ones no longer work.");
      },
      onError: (err) => toast.error(errorMessage(err, "Invalid verification code")),
    });
  };

  const doRevoke = () => {
    if (!revokeTarget) return;
    revoke.mutate(revokeTarget.id, {
      onSuccess: () => {
        setRevokeTarget(null);
        toast.success("That device has been signed out.");
      },
      onError: (err) => {
        setRevokeTarget(null);
        toast.error(errorMessage(err, "Could not sign out that device"));
      },
    });
  };

  const doLogoutAll = () => {
    logoutAll.mutate(undefined, {
      onSettled: () => {
        clearAuth();
        router.push("/super-admin/login");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12" role="status">
        <Spinner />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (isError || !me) {
    return (
      <div className="p-6 max-w-2xl">
        <Alert variant="error">Could not load your security settings. Refresh the page to try again.</Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <h1 className="text-title font-semibold text-on-surface">Security</h1>

      {newCodes && (
        <div className={sectionClass}>
          <RecoveryCodesPanel codes={newCodes} onDone={() => setNewCodes(null)} />
        </div>
      )}

      <PasswordSection />

      <section aria-labelledby="twofa-heading" className={sectionClass}>
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
              {me.twoFactorRequired
                ? "Required for every super admin account. It can't be turned off."
                : "This account can reach every organization. With two-factor on, a stolen password alone can't sign in."}
            </p>
          </div>
        </div>

        {me.twoFactorEnabled ? (
          !me.twoFactorRequired && (
            <form onSubmit={confirmDisable} className="space-y-3">
              <CodeField id="disable-code" value={code} onChange={setCode} />
              <Button type="submit" variant="destructive" loading={disable.isPending} disabled={code.length !== 6}>
                Turn off two-factor
              </Button>
            </form>
          )
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

      {me.twoFactorEnabled && (
        <section aria-labelledby="recovery-codes-heading" className={sectionClass}>
          <div>
            <h2 id="recovery-codes-heading" className="text-title-sm font-semibold text-on-surface">
              Recovery codes
            </h2>
            <p className="text-body text-on-surface-variant mt-1">
              {me.recoveryCodesRemaining} of 10 unused. Creating new codes replaces all of the old ones.
            </p>
          </div>
          {me.recoveryCodesRemaining <= 3 && (
            <Alert variant="warning">
              {me.recoveryCodesRemaining === 0
                ? "You have no recovery codes left. Create new ones now."
                : "You're running low on recovery codes."}
            </Alert>
          )}
          <form onSubmit={confirmRegenerate} className="space-y-3">
            <CodeField id="regen-code" value={regenCode} onChange={setRegenCode} />
            <Button type="submit" variant="secondary" loading={regenerate.isPending} disabled={regenCode.length !== 6}>
              Create new recovery codes
            </Button>
          </form>
        </section>
      )}

      <section aria-labelledby="session-heading" className={sectionClass}>
        <div>
          <h2 id="session-heading" className="text-title-sm font-semibold text-on-surface">Signed-in devices</h2>
          <p className="text-body text-on-surface-variant mt-1">
            Last sign-in: {me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString() : "—"}
          </p>
        </div>

        {sessions.isLoading ? (
          <div className="flex justify-center py-4" role="status">
            <Spinner />
            <span className="sr-only">Loading devices…</span>
          </div>
        ) : sessions.isError ? (
          <Alert variant="error">Could not load signed-in devices.</Alert>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {(sessions.data ?? []).map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <Monitor className="h-5 w-5 text-on-surface-variant shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-body-lg text-on-surface flex items-center gap-2">
                    {describeDevice(s.userAgent)}
                    {s.current && <Badge variant="success">This device</Badge>}
                  </p>
                  <p className="text-body text-on-surface-variant truncate">
                    {s.ipAddress ?? "Unknown IP"} · active {new Date(s.lastActiveAt).toLocaleString()}
                  </p>
                </div>
                {!s.current && (
                  <Button size="sm" variant="secondary" onClick={() => setRevokeTarget(s)}>
                    Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <Button variant="destructive" onClick={() => setConfirmLogoutAll(true)}>
          Sign out everywhere
        </Button>
      </section>

      <ConfirmDialog
        open={!!revokeTarget}
        title="Sign out this device?"
        message={`${describeDevice(revokeTarget?.userAgent ?? null)} will need to sign in again.`}
        confirmLabel="Sign out"
        loading={revoke.isPending}
        onConfirm={doRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
      <ConfirmDialog
        open={confirmLogoutAll}
        title="Sign out everywhere?"
        message="Every device, including this one, will need to sign in again."
        confirmLabel="Sign out everywhere"
        loading={logoutAll.isPending}
        onConfirm={doLogoutAll}
        onCancel={() => setConfirmLogoutAll(false)}
      />
    </div>
  );
}
