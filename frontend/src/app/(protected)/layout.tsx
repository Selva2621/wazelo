"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/lib/api/auth";
import { Spinner } from "@/components/ui/spinner";
import { AppShell } from "@/components/layout/app-shell";
import { useSubscription } from "@/hooks/use-billing";
import { useOrgSettings } from "@/hooks/use-settings";

// Pages exempt from subscription gate
const SUBSCRIPTION_EXEMPT = ["/onboarding", "/settings/billing"];

// Pages exempt from org-type gate
const ORG_TYPE_EXEMPT = ["/onboarding"];

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: subscriptionData, isLoading: subLoading, isError: subError } = useSubscription({
    enabled: isAuthenticated,
  });
  const { data: orgSettings, isLoading: orgLoading } = useOrgSettings();
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const setTokens = useAuthStore((s) => s.setTokens);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Prevents redirect loop: fires router.replace once while navigation is in-flight
  const redirectingRef = useRef(false);

  // Tracks whether the initial session-check attempt has completed
  const [sessionChecked, setSessionChecked] = useState(false);

  // Guard against React StrictMode double-invoke: only one refresh call per mount
  const refreshCalledRef = useRef(false);

  // On mount: always attempt silent refresh — backend is sole authority.
  // No client-side cookie gate: the httpOnly refresh token cookie is the only signal.
  useEffect(() => {
    if (accessToken) {
      // Already authenticated (client-side navigation between protected pages)
      setSessionChecked(true);
      return;
    }

    // Prevent duplicate refresh calls (React StrictMode fires effects twice in dev).
    // Token rotation means a second call with the already-rotated cookie → 401 → logout.
    if (refreshCalledRef.current) return;
    refreshCalledRef.current = true;

    authApi
      .refreshToken()
      .then((data) => {
        setTokens(data);
        setSessionChecked(true);
      })
      .catch(() => {
        clearAuth();
        setSessionChecked(true);
      });
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect unauthenticated users after session check completes.
  // Uses replace (not push) so the protected page is not added to browser history.
  useEffect(() => {
    if (!sessionChecked) return;
    if (!isAuthenticated) {
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      router.replace("/auth/login");
    }
  }, [sessionChecked, isAuthenticated, router]);

  // Org-type gate: redirect to /onboarding/type if org type is still the DB default ("CRM").
  // This fires for new users on TRIAL who skip /onboarding entirely.
  useEffect(() => {
    if (!isAuthenticated || orgLoading || orgSettings === undefined) return;
    const exempt = ORG_TYPE_EXEMPT.some((p) => pathname.startsWith(p));
    if (exempt) return;
    const orgType = orgSettings?.orgType;
    if (!orgType || orgType === "CRM") {
      router.replace("/onboarding/type");
    }
  }, [isAuthenticated, orgLoading, orgSettings, pathname, router]);

  // Subscription gate: redirect to onboarding if no active/trial subscription.
  // Skip on query error (e.g. backend down) — don't penalise user for infra issues.
  useEffect(() => {
    if (!isAuthenticated || subLoading || subError || subscriptionData === undefined) return;
    const exempt = SUBSCRIPTION_EXEMPT.some((p) => pathname.startsWith(p));
    if (exempt) return;
    const status = subscriptionData?.subscription?.status;
    const hasActive =
      status === "ACTIVE" ||
      status === "TRIAL" ||
      status === "GRACE_PERIOD" ||
      status === "PAST_DUE";
    if (!hasActive) {
      router.push("/onboarding");
    }
  }, [isAuthenticated, subLoading, subError, subscriptionData, pathname, router]);

  // Proactive token refresh: check every 60s, refresh if <2min remaining.
  // Silent fail — real 401s from API calls are handled by the Axios interceptor.
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAndRefresh = async () => {
      if (!expiresAt) return;
      const timeLeft = expiresAt - Date.now();
      if (timeLeft < 2 * 60 * 1000) {
        try {
          const data = await authApi.refreshToken();
          setTokens(data);
        } catch {
          // Do NOT force logout here — interceptor handles real 401s
        }
      }
    };

    intervalRef.current = setInterval(checkAndRefresh, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, expiresAt, setTokens]);

  // Show spinner while session check is in progress (prevents flash of login redirect)
  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Onboarding pages are full-screen — no sidebar or header
  if (pathname.startsWith("/onboarding")) {
    return <>{children}</>;
  }

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
