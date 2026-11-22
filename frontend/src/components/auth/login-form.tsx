"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowRight, Lock, Mail, MessageCircle, TriangleAlert } from "lucide-react";
import { WhatsappCodeSignin } from "@/components/auth/whatsapp-code-signin";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ContinueWithGoogle, ssoErrorMessage } from "@/components/auth/continue-with-google";

type Method = "email" | "whatsapp";

const METHODS: { id: Method; label: string; icon: typeof Mail; soon?: boolean }[] = [
  { id: "email", label: "Email", icon: Mail },
  // A code to the WhatsApp number the user verified at onboarding (sent from Wazelo HQ)
  { id: "whatsapp", label: "WhatsApp code", icon: MessageCircle },
];

const noopSubscribe = () => () => {};

interface LandingNotice {
  suspended: boolean;
  sso: string | null;
}
const NO_NOTICE: LandingNotice = { suspended: false, sso: null };

/** Read once per visit, so it stays put after ?ssoError is removed from the address bar */
let landingNotice: LandingNotice | null = null;
function readLandingNotice(): LandingNotice {
  if (!landingNotice) {
    const params = new URLSearchParams(window.location.search);
    landingNotice = { suspended: params.get("suspended") === "1", sso: params.get("ssoError") };
  }
  return landingNotice;
}
function clearLandingNotice() {
  landingNotice = null;
}

export function LoginForm() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const login = useLogin();
  const rememberMe = useWatch({ control, name: "rememberMe" }) ?? false;
  const [method, setMethod] = useState<Method>("email");
  const [capsLock, setCapsLock] = useState(false);
  // ?suspended=1 (API client: the org was suspended) and ?ssoError=<code> (backend: "Continue
  // with Google" failed), read from the URL this page was opened with
  const notice = useSyncExternalStore(noopSubscribe, readLandingNotice, () => NO_NOTICE);
  const suspended = notice.suspended;
  const [ssoDismissed, setSsoDismissed] = useState(false);
  const ssoError = notice.sso && !ssoDismissed ? ssoErrorMessage(notice.sso) : null;
  useEffect(() => {
    if (!notice.sso) return;
    // Don't show it again on reload
    const params = new URLSearchParams(window.location.search);
    params.delete("ssoError");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [notice.sso]);
  // A later visit (client-side navigation) reads its own URL
  useEffect(() => () => clearLandingNotice(), []);
  const tabRefs = useRef<Record<Method, HTMLButtonElement | null>>({ email: null, whatsapp: null });

  const onSubmit = (data: LoginFormData) => {
    setSsoDismissed(true);
    login.mutate(data);
  };

  const selectMethod = (next: Method) => {
    setMethod(next);
    tabRefs.current[next]?.focus();
  };

  // Tab pattern: arrow keys move between the two tabs.
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    selectMethod(method === "email" ? "whatsapp" : "email");
  };

  const trackCapsLock = (e: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState("CapsLock"));

  const passwordField = register("password");

  const errorMessage =
    login.error instanceof ApiError ? login.error.message : undefined;
  const showResend =
    errorMessage && errorMessage.toLowerCase().includes("verify");

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-display font-semibold text-on-surface">Welcome back</h1>
        <p className="mt-1.5 text-body-lg text-on-surface-variant">Sign in to continue to your inbox.</p>
      </div>

      {/* Method switch */}
      <div
        role="tablist"
        aria-label="Sign-in method"
        className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-outline-variant bg-surface-container-low p-1"
      >
        {METHODS.map(({ id, label, icon: Icon, soon }) => {
          const active = method === id;
          return (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={active}
              aria-controls={`panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setMethod(id)}
              onKeyDown={onTabKeyDown}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 rounded-lg text-body font-medium transition-colors duration-120 ease-standard",
                "outline-none focus-visible:ring-2 focus-visible:ring-focus",
                active
                  ? "bg-surface-container-lowest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-primary-container")} />
              {id === "whatsapp" ? (
                <span>
                  WhatsApp<span className="hidden sm:inline"> code</span>
                </span>
              ) : (
                label
              )}
              {soon && (
                <Badge variant="primary" className="px-1.5 py-0 font-semibold">
                  Soon
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Email panel */}
      <div role="tabpanel" id="panel-email" aria-labelledby="tab-email" hidden={method !== "email"}>
        {ssoError && !errorMessage && (
          <div className="mb-5">
            <Alert variant="error">{ssoError}</Alert>
          </div>
        )}
        {suspended && !errorMessage && !ssoError && (
          <div className="mb-5">
            <Alert variant="warning">
              Your organization has been suspended, so you were signed out. Contact Wazelo support to restore access.
            </Alert>
          </div>
        )}
        {errorMessage && (
          <div className="mb-5">
            <Alert variant="error">
              {errorMessage}
              {showResend && (
                <>
                  {" "}
                  <Link
                    href="/auth/register"
                    className="font-medium text-error underline underline-offset-2"
                  >
                    Resend verification
                  </Link>
                </>
              )}
            </Alert>
          </div>
        )}

        <ContinueWithGoogle intent="signin" rememberMe={rememberMe} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              autoFocus
              leadingIcon={<Mail />}
              className="h-11"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              leadingIcon={<Lock />}
              className="h-11"
              error={errors.password?.message}
              {...passwordField}
              onKeyDown={trackCapsLock}
              onKeyUp={trackCapsLock}
              onBlur={(e) => {
                setCapsLock(false);
                return passwordField.onBlur(e);
              }}
            />
            {capsLock && (
              <p className="flex items-center gap-1.5 text-caption text-warning" role="status">
                <TriangleAlert className="h-3.5 w-3.5" />
                Caps Lock is on
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="flex cursor-pointer select-none items-center gap-2 text-body text-on-surface-variant">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded border-outline accent-primary"
                {...register("rememberMe")}
              />
              Remember me
            </label>
            <Link
              href="/auth/forgot-password"
              className="rounded text-body font-medium text-primary-container underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            loading={login.isPending}
            className="w-full"
            size="lg"
          >
            Sign in
            {!login.isPending && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      </div>

      {/* WhatsApp panel: a code to the verified WhatsApp number */}
      <div role="tabpanel" id="panel-whatsapp" aria-labelledby="tab-whatsapp" hidden={method !== "whatsapp"}>
        <WhatsappCodeSignin onUsePassword={() => selectMethod("email")} />
      </div>

      {/* Register: a quiet text link so it never competes with Sign in */}
      <p className="mt-8 text-center text-body text-on-surface-variant">
        New to Wazelo?{" "}
        <Link
          href="/auth/register"
          className="rounded font-medium text-primary-container underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
        >
          Create a free account
        </Link>
      </p>
    </div>
  );
}
