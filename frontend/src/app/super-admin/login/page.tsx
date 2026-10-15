"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Loader2 } from "lucide-react";
import {
  useSALogin,
  useSALoginTwoFactor,
  useSALoginTwoFactorSetup,
  useSALoginTwoFactorEnroll,
  useSALoginPasswordChange,
} from "@/hooks/use-super-admin";
import { useSuperAdminAuthStore } from "@/stores/super-admin-auth-store";
import type { SuperAdminLoginResponse, SuperAdminSession, TwoFactorSetup } from "@/lib/api/super-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert } from "@/components/ui/alert";
import { RecoveryCodesPanel } from "@/components/super-admin/recovery-codes-panel";
import { NewPasswordFields, isNewPasswordValid } from "@/components/super-admin/new-password-fields";

type Step = "password" | "new-password" | "code" | "setup" | "recovery-codes";

const RECOVERY_CODE = /^[A-Za-z0-9]{5}-?[A-Za-z0-9]{5}$/;

function errorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  if (err?.response?.status === 429) return "Too many attempts. Wait a minute and try again.";
  return message ?? fallback;
}

function isChallengeExpired(err: any): boolean {
  return !!err?.response?.data?.message?.includes?.("sign in again");
}

function CodeInput({ value, onChange, hintId }: { value: string; onChange: (v: string) => void; hintId: string }) {
  return (
    <Input
      id="sa-code"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="\d{6}"
      maxLength={6}
      autoFocus
      aria-describedby={hintId}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      required
      className="tracking-[0.3em] text-center"
    />
  );
}

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const login = useSALogin();
  const loginTwoFactor = useSALoginTwoFactor();
  const startSetup = useSALoginTwoFactorSetup();
  const enroll = useSALoginTwoFactorEnroll();
  const passwordChange = useSALoginPasswordChange();
  const setAuth = useSuperAdminAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const goToDashboard = () => router.push("/super-admin/dashboard");

  const startSession = (session: SuperAdminSession) => {
    setAuth(session.superAdmin, session.accessToken);
    goToDashboard();
  };

  const backToPassword = () => {
    setStep("password");
    setChallengeToken(null);
    setSetup(null);
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setUseRecovery(false);
    setError(null);
  };

  const onChallengeError = (err: unknown, fallback: string) => {
    if (isChallengeExpired(err)) backToPassword();
    setError(errorMessage(err, fallback));
  };

  /** Routes any login-step result (password, or temporary-password replacement) to the next step. */
  const handleLoginResult = (data: SuperAdminLoginResponse) => {
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    if (data.requiresPasswordChange) {
      setChallengeToken(data.challengeToken);
      setStep("new-password");
      return;
    }
    if (data.requiresTwoFactor) {
      setChallengeToken(data.challengeToken);
      setStep("code");
      return;
    }
    if (data.requiresTwoFactorSetup) {
      setChallengeToken(data.challengeToken);
      setStep("setup");
      startSetup.mutate(data.challengeToken, {
        onSuccess: setSetup,
        onError: (err) => onChallengeError(err, "Could not start two-factor setup"),
      });
      return;
    }
    startSession(data);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    login.mutate(
      { email, password },
      {
        onSuccess: handleLoginResult,
        onError: (err) => setError(errorMessage(err, "Invalid credentials")),
      },
    );
  };

  const newPasswordValid = isNewPasswordValid(newPassword, confirmPassword);

  const handleNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeToken || !newPasswordValid) return;
    setError(null);
    passwordChange.mutate(
      { challengeToken, newPassword },
      {
        onSuccess: handleLoginResult,
        onError: (err) => onChallengeError(err, "Could not set your new password"),
      },
    );
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeToken) return;
    setError(null);
    loginTwoFactor.mutate(
      { challengeToken, code: code.trim() },
      { onSuccess: startSession, onError: (err) => onChallengeError(err, "Invalid verification code") },
    );
  };

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeToken) return;
    setError(null);
    enroll.mutate(
      { challengeToken, code },
      {
        onSuccess: ({ recoveryCodes: codes, ...session }) => {
          setAuth(session.superAdmin, session.accessToken);
          setRecoveryCodes(codes);
          setStep("recovery-codes");
        },
        onError: (err) => onChallengeError(err, "Invalid verification code"),
      },
    );
  };

  const codeValid = useRecovery ? RECOVERY_CODE.test(code.trim()) : code.length === 6;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-8">
      <div className={step === "setup" || step === "recovery-codes" ? "w-full max-w-md" : "w-full max-w-sm"}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Flame className="h-7 w-7 text-primary" aria-hidden />
            <span className="text-on-surface font-semibold text-title">Wazelo CRM</span>
          </div>
          <h1 className="text-on-surface-variant text-body-lg">Super Admin Portal</h1>
        </div>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="sa-email" className="block text-body-lg font-medium text-on-surface-variant mb-1">
                Email
              </label>
              <Input
                id="sa-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@wazelo.in"
              />
            </div>
            <div>
              <label htmlFor="sa-password" className="block text-body-lg font-medium text-on-surface-variant mb-1">
                Password
              </label>
              <PasswordInput
                id="sa-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button size="lg" type="submit" disabled={login.isPending} className="w-full">
              {login.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Sign in
            </Button>
          </form>
        )}

        {step === "new-password" && (
          <form onSubmit={handleNewPasswordSubmit} className="space-y-4" noValidate>
            <div>
              <h2 className="text-title-sm font-semibold text-on-surface">Set a new password</h2>
              <p className="text-body text-on-surface-variant mt-1">
                You signed in with a temporary password. Replace it with one only you know before you continue.
              </p>
            </div>
            {/* Lets password managers save the new password against the right account */}
            <input type="email" autoComplete="username" value={email} readOnly hidden />
            <NewPasswordFields
              idPrefix="sa-new-password"
              newPassword={newPassword}
              confirm={confirmPassword}
              onNewPasswordChange={setNewPassword}
              onConfirmChange={setConfirmPassword}
              autoFocus
            />

            <Button size="lg" type="submit" disabled={passwordChange.isPending || !newPasswordValid} className="w-full">
              {passwordChange.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Set password and continue
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={backToPassword}>
              Back to sign in
            </Button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleCodeSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="sa-code" className="block text-body-lg font-medium text-on-surface-variant mb-1">
                {useRecovery ? "Recovery code" : "Verification code"}
              </label>
              <p id="sa-code-hint" className="text-body text-on-surface-variant mb-2">
                {useRecovery
                  ? "Enter one of your saved recovery codes. Each code works once."
                  : "Enter the 6-digit code from your authenticator app."}
              </p>
              {useRecovery ? (
                <Input
                  id="sa-code"
                  autoComplete="off"
                  autoFocus
                  maxLength={11}
                  aria-describedby="sa-code-hint"
                  placeholder="XXXXX-XXXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  className="tracking-widest text-center font-mono"
                />
              ) : (
                <CodeInput value={code} onChange={setCode} hintId="sa-code-hint" />
              )}
            </div>

            <Button size="lg" type="submit" disabled={loginTwoFactor.isPending || !codeValid} className="w-full">
              {loginTwoFactor.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Verify
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => {
                setUseRecovery((v) => !v);
                setCode("");
                setError(null);
              }}
            >
              {useRecovery ? "Use authenticator code" : "Lost your authenticator? Use a recovery code"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={backToPassword}>
              Back to sign in
            </Button>
          </form>
        )}

        {step === "setup" && (
          <form onSubmit={handleEnrollSubmit} className="space-y-4" noValidate>
            <div>
              <h2 className="text-title-sm font-semibold text-on-surface">Set up two-factor authentication</h2>
              <p className="text-body text-on-surface-variant mt-1">
                Required for every super admin account before you can continue.
              </p>
            </div>
            {!setup ? (
              <div className="flex justify-center py-8" role="status">
                <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
                <span className="sr-only">Loading…</span>
              </div>
            ) : (
              <>
                <ol className="list-decimal pl-5 space-y-2 text-body-lg text-on-surface">
                  <li>Open Google Authenticator, 1Password, Authy or a similar app.</li>
                  <li>Scan this QR code, or enter the key below by hand.</li>
                  <li>Enter the 6-digit code the app shows.</li>
                </ol>
                <img
                  src={setup.qrCodeDataUrl}
                  alt="QR code for adding this account to an authenticator app"
                  className="h-44 w-44 rounded-lg bg-white p-2 mx-auto"
                />
                <div>
                  <p className="text-body text-on-surface-variant">Setup key</p>
                  <code className="block break-all text-body-lg text-on-surface select-all">{setup.secret}</code>
                </div>
                <div>
                  <label htmlFor="sa-code" className="block text-body-lg font-medium text-on-surface-variant mb-1">
                    Verification code
                  </label>
                  <p id="sa-setup-hint" className="sr-only">6-digit code from your authenticator app</p>
                  <CodeInput value={code} onChange={setCode} hintId="sa-setup-hint" />
                </div>
                <Button size="lg" type="submit" disabled={enroll.isPending || code.length !== 6} className="w-full">
                  {enroll.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Turn on and sign in
                </Button>
              </>
            )}
            <Button type="button" variant="ghost" className="w-full" onClick={backToPassword}>
              Back to sign in
            </Button>
          </form>
        )}

        {step === "recovery-codes" && (
          <RecoveryCodesPanel codes={recoveryCodes} doneLabel="Continue to dashboard" onDone={goToDashboard} />
        )}
      </div>
    </div>
  );
}
