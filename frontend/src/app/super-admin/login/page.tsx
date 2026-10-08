"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Loader2 } from "lucide-react";
import { useSALogin, useSALoginTwoFactor } from "@/hooks/use-super-admin";
import { useSuperAdminAuthStore } from "@/stores/super-admin-auth-store";
import type { SuperAdminSession } from "@/lib/api/super-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert } from "@/components/ui/alert";

function errorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  if (err?.response?.status === 429) return "Too many attempts. Wait a minute and try again.";
  return message ?? fallback;
}

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const login = useSALogin();
  const loginTwoFactor = useSALoginTwoFactor();
  const setAuth = useSuperAdminAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startSession = (session: SuperAdminSession) => {
    setAuth(session.superAdmin, session.accessToken);
    router.push("/super-admin/dashboard");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    login.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          if (data.requiresTwoFactor) {
            setChallengeToken(data.challengeToken);
            setPassword("");
            return;
          }
          startSession(data);
        },
        onError: (err) => setError(errorMessage(err, "Invalid credentials")),
      },
    );
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeToken) return;
    setError(null);
    loginTwoFactor.mutate(
      { challengeToken, code },
      {
        onSuccess: startSession,
        onError: (err: any) => {
          // Challenge expired (5 min) → back to the password step
          if (err?.response?.data?.message?.includes?.("sign in again")) {
            setChallengeToken(null);
            setCode("");
          }
          setError(errorMessage(err, "Invalid verification code"));
        },
      },
    );
  };

  const backToPassword = () => {
    setChallengeToken(null);
    setCode("");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
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

        {!challengeToken ? (
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
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="sa-code" className="block text-body-lg font-medium text-on-surface-variant mb-1">
                Verification code
              </label>
              <p id="sa-code-hint" className="text-body text-on-surface-variant mb-2">
                Enter the 6-digit code from your authenticator app.
              </p>
              <Input
                id="sa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                autoFocus
                aria-describedby="sa-code-hint"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                className="tracking-[0.3em] text-center"
              />
            </div>

            <Button
              size="lg"
              type="submit"
              disabled={loginTwoFactor.isPending || code.length !== 6}
              className="w-full"
            >
              {loginTwoFactor.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Verify
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={backToPassword}>
              Back to sign in
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
