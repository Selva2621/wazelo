"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthCard } from "@/components/auth/auth-card";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <AuthCard>
        <CardHeader>
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="error">
            No reset token found. Please request a new password reset link.
          </Alert>
        </CardContent>
        <CardFooter>
          <Link
            href="/auth/forgot-password"
            className="text-[13px] text-primary hover:underline"
          >
            Request a new link
          </Link>
        </CardFooter>
      </AuthCard>
    );
  }

  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}
