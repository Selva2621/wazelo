"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { refreshSession } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { homePathFor } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Landing page after "Continue with Google". The backend has already set the HttpOnly
 * refresh cookie; restore the session from it exactly like a page reload does, then go
 * where a password login goes (new orgs straight to onboarding).
 */
export function GoogleSignInComplete() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const startedRef = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Refresh tokens are single-use: never run this twice for the same attempt
    if (startedRef.current && attempt === 0) return;
    startedRef.current = true;

    const remembered = new URLSearchParams(window.location.search).get("r") === "1";

    refreshSession()
      .then((session) => {
        // Never show a new user anything cached for whoever used this tab before
        queryClient.clear();
        if (session.user) {
          useAuthStore.getState().setAuth({ ...session, user: session.user, rememberMe: remembered });
        }
        router.replace(homePathFor(session.user?.orgType));
      })
      .catch((err) => {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 401 || status === 403) {
          useAuthStore.getState().clearAuth();
          router.replace("/auth/login?ssoError=google_error");
          return;
        }
        // Network blip / cold backend: the cookie may still be good, let the user retry
        setFailed(true);
      });
  }, [attempt, queryClient, router]);

  if (failed) {
    return (
      <div className="space-y-5">
        <Alert variant="error">We couldn&apos;t reach the server to finish signing you in.</Alert>
        <div className="flex gap-3">
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
          <Link
            href="/auth/login"
            className="flex h-9 flex-1 items-center justify-center rounded-lg border border-outline-variant text-body-lg font-medium text-on-surface-variant outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center" role="status">
      <Spinner size="lg" className="text-primary" />
      <p className="text-body-lg text-on-surface-variant">Signing you in…</p>
    </div>
  );
}
