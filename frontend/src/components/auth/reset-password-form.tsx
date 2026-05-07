"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@/lib/validations/auth";
import { useResetPassword } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { AuthCard } from "./auth-card";
import { PasswordStrengthIndicator } from "./password-strength-indicator";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const resetPassword = useResetPassword();
  const password = watch("newPassword");

  const onSubmit = (data: ResetPasswordFormData) => {
    resetPassword.mutate(
      { token, newPassword: data.newPassword },
      { onSuccess: () => setSuccess(true) },
    );
  };

  const errorMessage =
    resetPassword.error instanceof ApiError
      ? resetPassword.error.message
      : undefined;

  const isExpired = errorMessage?.toLowerCase().includes("expired");

  if (success) {
    return (
      <AuthCard>
        <CardHeader>
          <CardTitle>Password reset successful</CardTitle>
          <CardDescription>
            Your password has been updated. You can now sign in with your new
            password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth/login">
            <Button className="w-full" size="lg">
              Go to login
            </Button>
          </Link>
        </CardContent>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMessage && (
            <Alert variant="error">
              {errorMessage}
              {isExpired && (
                <>
                  {" "}
                  <Link
                    href="/auth/forgot-password"
                    className="font-medium text-error underline underline-offset-2"
                  >
                    Request a new link
                  </Link>
                </>
              )}
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="newPassword" required>
              New password
            </Label>
            <PasswordInput
              id="newPassword"
              placeholder="Create a strong password"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              {...register("newPassword")}
            />
            <PasswordStrengthIndicator password={password} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" required>
              Confirm password
            </Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Confirm your password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
          </div>

          <Button
            type="submit"
            loading={resetPassword.isPending}
            className="w-full"
            size="lg"
          >
            Reset password
          </Button>
        </form>
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
