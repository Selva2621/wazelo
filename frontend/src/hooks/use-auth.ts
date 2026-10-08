"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
} from "@/lib/types/auth";

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data, variables) => {
      // Never show a new user anything cached for whoever used this tab before.
      queryClient.clear();
      setAuth({ ...data, rememberMe: variables.rememberMe ?? false });
      // Go straight to the right dashboard instead of bouncing through /dashboard
      router.push(data.user.orgType === "FREELANCER" ? "/dashboard/freelancer" : "/dashboard");
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (data: VerifyEmailRequest) => authApi.verifyEmail(data),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (data: ResendVerificationRequest) =>
      authApi.resendVerification(data),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordRequest) => authApi.forgotPassword(data),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => authApi.resetPassword(data),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      // Clear in-memory auth (also drops the realtime socket) and every cached query, so
      // nothing from this account stays readable in the tab. ProtectedLayout's redirect
      // effect then navigates to /auth/login when isAuthenticated becomes false.
      clearAuth();
      queryClient.clear();
    },
  });
}
