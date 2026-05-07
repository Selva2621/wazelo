"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth";
import { useRegister } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { PasswordStrengthIndicator } from "./password-strength-indicator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function RegisterForm() {
  const [success, setSuccess] = useState(false);

  const {
    register: formRegister,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      organizationName: "",
    },
  });

  const registerMutation = useRegister();
  const password = watch("password");

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data, {
      onSuccess: () => setSuccess(true),
    });
  };

  const errorMessage =
    registerMutation.error instanceof ApiError
      ? registerMutation.error.message
      : undefined;

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-7 h-7 text-success" />
        </div>
        <h2 className="text-[22px] font-extrabold tracking-tight text-on-surface mb-3">
          Check your inbox
        </h2>
        <p className="text-[14px] text-on-surface-variant leading-relaxed mb-6 max-w-[320px] mx-auto">
          We&apos;ve sent a verification link to your email. Click it to activate your account.
        </p>
        <div className="flex flex-col gap-3 items-center text-[13px] text-on-surface-variant/60 mb-6">
          {["Check spam if you don't see it", "Link expires in 24 hours"].map(tip => (
            <div key={tip} className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success/60" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
        <Link href="/auth/login" className="text-[13px] text-primary hover:underline font-medium">
          ← Back to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-[26px] font-extrabold tracking-tight text-on-surface mb-2 leading-tight">
          Start for free
        </h1>
        <p className="text-[14px] text-on-surface-variant leading-relaxed">
          Set up your WhatsApp CRM in minutes. No credit card needed.
        </p>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="mb-5">
          <Alert variant="error">{errorMessage}</Alert>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" required>First name</Label>
            <Input
              id="firstName"
              placeholder="John"
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...formRegister("firstName")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" required>Last name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...formRegister("lastName")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="orgName" required>Organization name</Label>
          <Input
            id="orgName"
            placeholder="Acme Inc."
            error={errors.organizationName?.message}
            {...formRegister("organizationName")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" required>Work email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            error={errors.email?.message}
            {...formRegister("email")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" required>Password</Label>
          <PasswordInput
            id="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...formRegister("password")}
          />
          <PasswordStrengthIndicator password={password} />
        </div>

        <Button
          type="submit"
          loading={registerMutation.isPending}
          className="w-full mt-1"
          size="lg"
        >
          Create account
          {!registerMutation.isPending && <ArrowRight className="w-4 h-4" />}
        </Button>
      </form>

      {/* Terms note */}
      <p className="text-[11px] text-on-surface-variant/50 text-center mt-4 leading-relaxed">
        By creating an account, you agree to our{" "}
        <Link href="#" className="text-primary/70 hover:text-primary">Terms</Link>
        {" & "}
        <Link href="#" className="text-primary/70 hover:text-primary">Privacy Policy</Link>
      </p>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-outline-variant" />
        <span className="text-[11px] text-on-surface-variant/50 uppercase tracking-widest">Have an account?</span>
        <div className="flex-1 h-px bg-outline-variant" />
      </div>

      <Link
        href="/auth/login"
        className="flex items-center justify-center w-full py-3 rounded-xl border border-outline-variant text-[14px] font-semibold text-on-surface-variant gap-1.5 transition-all duration-200 hover:border-primary hover:text-primary hover:bg-primary/5"
      >
        Sign in instead
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
