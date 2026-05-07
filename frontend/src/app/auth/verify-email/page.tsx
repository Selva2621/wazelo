"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useVerifyEmail, useResendVerification } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { AuthCard } from "@/components/auth/auth-card";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const verifyEmail = useVerifyEmail();
  const resend = useResendVerification();
  const [resendEmail, setResendEmail] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    if (token && !calledRef.current) {
      calledRef.current = true;
      verifyEmail.mutate({ token });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    resend.mutate(
      { email: resendEmail },
      { onSuccess: () => setResendSuccess(true) },
    );
  };

  // Loading state
  if (token && verifyEmail.isPending) {
    return (
      <AuthCard>
        <CardContent className="mt-0 flex flex-col items-center gap-4 py-12">
          <Spinner size="lg" className="text-primary" />
          <p className="text-[15px] text-on-surface-variant">
            Verifying your email...
          </p>
        </CardContent>
      </AuthCard>
    );
  }

  // Success state
  if (token && verifyEmail.isSuccess) {
    return (
      <AuthCard>
        <CardContent className="mt-0 flex flex-col items-center gap-4 py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-container">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-on-surface">
              Email verified
            </h2>
            <p className="mt-1 text-[14px] text-on-surface-variant">
              Your account is now active. You can sign in.
            </p>
          </div>
          <Link href="/auth/login" className="mt-2">
            <Button size="lg">Go to login</Button>
          </Link>
        </CardContent>
      </AuthCard>
    );
  }

  // Error state (or no token provided)
  const errorMessage =
    verifyEmail.error instanceof ApiError
      ? verifyEmail.error.message
      : !token
        ? "No verification token provided."
        : "Verification failed. Please try again.";

  return (
    <AuthCard>
      <CardHeader>
        <CardTitle>Email verification</CardTitle>
        <CardDescription>
          {token
            ? "There was a problem verifying your email."
            : "A verification token is required."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Alert variant="error" className="mb-4">
          {errorMessage}
        </Alert>

        <div className="mt-6 border-t border-outline-variant/20 pt-6">
          <p className="mb-3 text-[13px] text-on-surface-variant">
            Request a new verification email:
          </p>
          <form onSubmit={handleResend} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="resend-email">Email</Label>
              <Input
                id="resend-email"
                type="email"
                placeholder="you@company.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
            </div>
            {resendSuccess && (
              <Alert variant="success">
                If an account exists, a new verification email has been sent.
              </Alert>
            )}
            <Button
              type="submit"
              variant="secondary"
              loading={resend.isPending}
              className="w-full"
            >
              Resend verification email
            </Button>
          </form>
        </div>
      </CardContent>

      <CardFooter>
        <Link
          href="/auth/login"
          className="text-[13px] text-primary hover:underline"
        >
          Back to login
        </Link>
      </CardFooter>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthCard>
          <CardContent className="mt-0 flex items-center justify-center py-12">
            <Spinner size="lg" className="text-primary" />
          </CardContent>
        </AuthCard>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
