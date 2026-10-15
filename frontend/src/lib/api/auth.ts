import apiClient, { API_BASE_URL, refreshSession } from "./client";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  RefreshTokenResponse,
  SessionInfo,
  MessageResponse,
  AuthProviders,
} from "@/lib/types/auth";

/** Full-page navigation target that starts "Continue with Google" on the backend. */
export function googleStartUrl(intent: "signin" | "signup", rememberMe = false): string {
  const params = new URLSearchParams({ intent });
  if (rememberMe) params.set("remember", "1");
  return `${API_BASE_URL}/auth/google/start?${params.toString()}`;
}

export const authApi = {
  /** Which external sign-in options to show (public). */
  getProviders: () =>
    apiClient.get<AuthProviders>("/auth/providers").then((r) => r.data),

  register: (data: RegisterRequest) =>
    apiClient.post<MessageResponse>("/auth/register", data).then((r) => r.data),

  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>("/auth/login", data).then((r) => r.data),

  verifyEmail: (data: VerifyEmailRequest) =>
    apiClient
      .post<MessageResponse>("/auth/verify-email", data)
      .then((r) => r.data),

  resendVerification: (data: ResendVerificationRequest) =>
    apiClient
      .post<MessageResponse>("/auth/resend-verification", data)
      .then((r) => r.data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient
      .post<MessageResponse>("/auth/forgot-password", data)
      .then((r) => r.data),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient
      .post<MessageResponse>("/auth/reset-password", data)
      .then((r) => r.data),

  // Shares the client's single in-flight refresh (refresh tokens are single-use).
  refreshToken: () => refreshSession() as Promise<RefreshTokenResponse>,

  // No body needed — refresh token cookie cleared by backend on logout
  logout: () =>
    apiClient.post<MessageResponse>("/auth/logout").then((r) => r.data),

  getSessions: () =>
    apiClient.get<SessionInfo[]>("/auth/sessions").then((r) => r.data),

  revokeSession: (sessionId: string) =>
    apiClient
      .delete<MessageResponse>(`/auth/sessions/${sessionId}`)
      .then((r) => r.data),

  revokeAllSessions: () =>
    apiClient
      .delete<MessageResponse>("/auth/sessions")
      .then((r) => r.data),
};
