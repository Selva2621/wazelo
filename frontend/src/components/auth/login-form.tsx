"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const login = useLogin();

  const onSubmit = (data: LoginFormData) => {
    login.mutate(data);
  };

  const errorMessage =
    login.error instanceof ApiError ? login.error.message : undefined;
  const showResend =
    errorMessage && errorMessage.toLowerCase().includes("verify");

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[26px] font-extrabold tracking-tight text-on-surface mb-2 leading-tight">
          Welcome back
        </h1>
        <p className="text-[14px] text-on-surface-variant leading-relaxed">
          Sign in to your Wazelo CRM account
        </p>
      </div>

      {/* Error */}
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" required>Password</Label>
            <Link
              href="/auth/forgot-password"
              className="text-[12px] text-primary hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="rememberMe"
            className="w-4 h-4 rounded border-outline accent-primary cursor-pointer"
            {...register("rememberMe")}
          />
          <label
            htmlFor="rememberMe"
            className="text-[13px] text-on-surface-variant cursor-pointer select-none"
          >
            Remember me
          </label>
        </div>

        <Button
          type="submit"
          loading={login.isPending}
          className="w-full mt-2"
          size="lg"
        >
          Sign in
          {!login.isPending && <ArrowRight className="w-4 h-4" />}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-outline-variant" />
        <span className="text-[11px] text-on-surface-variant/50 uppercase tracking-widest">New here?</span>
        <div className="flex-1 h-px bg-outline-variant" />
      </div>

      {/* Register link */}
      <Link
        href="/auth/register"
        className="flex items-center justify-center w-full py-3 rounded-xl border border-outline-variant text-[14px] font-semibold text-on-surface-variant gap-1.5 transition-all duration-200 hover:border-primary hover:text-primary hover:bg-primary/5"
      >
        Create a free account
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
