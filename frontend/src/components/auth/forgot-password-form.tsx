"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, Clock } from "lucide-react";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/lib/validations/auth";
import { useForgotPassword } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const forgotPassword = useForgotPassword();

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPassword.mutate(data, {
      onSuccess: () => setSuccess(true),
    });
  };

  const errorMessage =
    forgotPassword.error instanceof ApiError
      ? forgotPassword.error.message
      : undefined;

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-[22px] font-extrabold tracking-tight text-on-surface mb-3">
          Reset link sent
        </h2>
        <p className="text-[14px] text-on-surface-variant leading-relaxed mb-5 max-w-[300px] mx-auto">
          If that email exists in our system, you&apos;ll receive a password reset link shortly.
        </p>
        <div className="flex items-center justify-center gap-2 text-[12px] text-on-surface-variant/60 mb-7">
          <Clock className="w-3.5 h-3.5" />
          <span>Link expires in 1 hour · Check spam folder</span>
        </div>
        <Link href="/auth/login" className="text-[13px] text-primary hover:underline font-medium">
          ← Back to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors mb-7"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to login
      </Link>

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-[26px] font-extrabold tracking-tight text-on-surface mb-2 leading-tight">
          Forgot password?
        </h1>
        <p className="text-[14px] text-on-surface-variant leading-relaxed">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="mb-5">
          <Alert variant="error">{errorMessage}</Alert>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" required>Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
        </div>

        <Button
          type="submit"
          loading={forgotPassword.isPending}
          className="w-full"
          size="lg"
        >
          Send reset link
          {!forgotPassword.isPending && <ArrowRight className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
