"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL, refreshSession } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { homePathFor } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

/** A page of this app to land on ("/inbox"); anything else (other sites, "//host") → null */
function safeAppPath(next: string | null): string | null {
  if (!next || next.length > 200) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\s:]/.test(next.split("?")[0])) return null;
  return next;
}

/**
 * Landing page for "Open Wazelo HQ" in the super admin portal. The one-time code arrives
 * in the URL fragment (never sent to a server log); it is traded for the HQ session's
 * refresh cookie, then the session is restored exactly like after Google sign-in.
 */
export function HqSignInComplete() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The code is single-use: never send it twice (React dev double-runs effects)
    if (startedRef.current) return;
    startedRef.current = true;

    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const code = fragment.get("code");
    const next = safeAppPath(fragment.get("next"));
    // Out of the address bar and history right away
    window.history.replaceState(null, "", window.location.pathname);
    if (!code) {
      setError("This link is missing its sign-in code. Open Wazelo HQ again from the super admin portal.");
      return;
    }

    axios
      .post(
        `${API_BASE_URL}/auth/hq/exchange`,
        { code },
        { withCredentials: true, headers: { "x-requested-with": "XMLHttpRequest" }, timeout: 15000 },
      )
      .then(() => refreshSession())
      .then((session) => {
        // Nothing cached for whoever used this tab before
        queryClient.clear();
        if (session.user) {
          useAuthStore.getState().setAuth({ ...session, user: session.user, rememberMe: false });
        }
        router.replace(next ?? homePathFor(session.user?.orgType));
      })
      .catch((err) => {
        const message = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
        setError(
          typeof message === "string"
            ? message
            : "We couldn't open Wazelo HQ. Open it again from the super admin portal.",
        );
      });
  }, [queryClient, router]);

  if (error) {
    return (
      <div className="space-y-5">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center" role="status">
      <Spinner size="lg" className="text-primary" />
      <p className="text-body-lg text-on-surface-variant">Opening Wazelo HQ…</p>
    </div>
  );
}
