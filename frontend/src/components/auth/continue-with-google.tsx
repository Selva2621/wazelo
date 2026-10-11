"use client";

import { useEffect, useState } from "react";
import { useAuthProviders } from "@/hooks/use-auth";
import { googleStartUrl } from "@/lib/api/auth";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Messages for the backend's ?ssoError=… codes (Google callback failures). */
export const SSO_ERROR_MESSAGES: Record<string, string> = {
  google_signup_disabled:
    "Sign-up with Google isn't available right now. Create an account with your email instead.",
  email_unverified:
    "Google hasn't verified this email address. Sign in with your email and password instead.",
  account_suspended: "Your account has been suspended. Contact your organization administrator.",
  account_locked: "Your account is temporarily locked after too many failed sign-in attempts. Try again later.",
  org_suspended: "Your organization has been suspended. Contact Wazelo support to restore access.",
  account_unavailable: "This email can't be used to sign in. Contact Wazelo support if you think this is a mistake.",
  not_configured: "Sign-in with Google isn't available right now. Use your email and password.",
  invalid_state: "Your Google sign-in expired or was interrupted. Please try again.",
  google_cancelled: "Google sign-in was cancelled.",
  google_error: "We couldn't sign you in with Google. Please try again.",
};

export function ssoErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return SSO_ERROR_MESSAGES[code] ?? SSO_ERROR_MESSAGES.google_error;
}

/** Google's multicolour "G" mark (brand guidelines: unmodified, on white). */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

interface ContinueWithGoogleProps {
  intent: "signin" | "signup";
  /** Sign-in only: keep the session for 30 days, like "Remember me" */
  rememberMe?: boolean;
  className?: string;
}

/**
 * "Continue with Google" + an "or" divider. Renders nothing while loading, when Google
 * isn't configured, or (sign-up) when new Google sign-ups are turned off.
 */
export function ContinueWithGoogle({ intent, rememberMe = false, className }: ContinueWithGoogleProps) {
  const { data } = useAuthProviders();
  const [redirecting, setRedirecting] = useState(false);

  // Coming back with the browser's Back button restores this page from bfcache mid-"redirecting"
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => {
      if (e.persisted) setRedirecting(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const google = data?.google;
  const visible = !!google?.configured && (intent === "signin" || google.signupEnabled);
  if (!visible) return null;

  return (
    <div className={className}>
      {/* A full-page navigation: the backend sets the state cookie and redirects to Google */}
      <a
        href={googleStartUrl(intent, rememberMe)}
        onClick={() => setRedirecting(true)}
        aria-busy={redirecting}
        className={cn(
          // Google brand: white fill, #747775 border, #1F1F1F text, in both themes
          "flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#747775] bg-[#ffffff] px-4",
          "text-body-lg font-medium text-[#1f1f1f] transition-colors duration-120 ease-standard hover:bg-[#f7f8f8]",
          "outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          redirecting && "pointer-events-none opacity-80",
        )}
      >
        {redirecting ? <Spinner size="sm" className="text-[#1f1f1f]" /> : <GoogleLogo className="size-5" />}
        Continue with Google
      </a>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-outline-variant" />
        <span className="text-caption text-on-surface-variant">or</span>
        <div className="h-px flex-1 bg-outline-variant" />
      </div>
    </div>
  );
}
