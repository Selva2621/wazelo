import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import type { ApiResponse, ApiErrorResponse } from "@/lib/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export class ApiError extends Error {
  statusCode: number;
  errorCode?: string;
  errors?: Record<string, string[]>;
  details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string,
    errors?: Record<string, string[]>,
    errorCode?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.errorCode = errorCode;
    this.details = details;
  }
}

const METRIC_LABELS: Record<string, string> = {
  MESSAGES_SENT: "messages",
  CAMPAIGN_EXECUTIONS: "campaigns",
  ACTIVE_USERS: "users",
  WHATSAPP_SESSIONS: "WhatsApp sessions",
  API_CALLS: "API calls",
  AI_CREDITS: "AI credits",
  MESSAGE_TEMPLATES: "message templates",
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    // CSRF protection: custom header that browsers cannot set cross-origin without preflight
    "x-requested-with": "XMLHttpRequest",
  },
  // Send httpOnly refresh token cookie on every request
  withCredentials: true,
  timeout: 15000,
});

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const { useAuthStore } = require("@/stores/auth-store");
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface RefreshedSession {
  accessToken: string;
  expiresIn: number;
  user?: import("@/lib/types/auth").AuthUser;
}

// Single in-flight refresh shared by every caller (startup check, proactive timer, 401
// retries). Refresh tokens are single-use, so two parallel refreshes would make the
// second one fail and log the user out.
let refreshInFlight: Promise<RefreshedSession> | null = null;

/** Exchanges the httpOnly refresh cookie for a new access token and stores it. */
export function refreshSession(): Promise<RefreshedSession> {
  refreshInFlight ??= axios
    .post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      // Same timeout as apiClient: a hung refresh would otherwise hold the app skeleton forever
      { withCredentials: true, headers: { "x-requested-with": "XMLHttpRequest" }, timeout: 15000 },
    )
    .then((res) => {
      const data: RefreshedSession = res.data.data || res.data;
      const { useAuthStore } = require("@/stores/auth-store");
      useAuthStore.getState().setTokens(data);
      return data;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

// Auth endpoints answer 401 for their own reasons (bad password, no cookie); retrying
// them through a refresh would replace the real error with "Session expired".
const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/auth/forgot-password",
  "/auth/reset-password",
];

// Response interceptor: unwrap envelope + handle 401 refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    // Unwrap the { success, data } envelope
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      response.data = response.data.data as ApiResponse<unknown>;
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retried, attempt silent token refresh via httpOnly cookie
    const isAuthEndpoint = NO_REFRESH_PATHS.some((p) => originalRequest?.url?.startsWith(p));
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint &&
      typeof window !== "undefined"
    ) {
      originalRequest._retry = true;
      try {
        const { accessToken } = await refreshSession();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // A rate-limited refresh (429) is not proof the session is gone; keep the user in.
        if (axios.isAxiosError(refreshError) && refreshError.response?.status === 429) {
          return Promise.reject(new ApiError(429, "Too many requests. Please try again shortly."));
        }
        const { useAuthStore } = require("@/stores/auth-store");
        useAuthStore.getState().clearAuth();
        return Promise.reject(
          new ApiError(401, "Session expired. Please log in again."),
        );
      }
    }

    // Transform error to ApiError
    if (error.response?.data) {
      const { statusCode, message, errors, error: errorCode, details } = error.response.data;
      const msg = Array.isArray(message) ? message[0] : message;

      // Org suspended by Wazelo: end the session and explain on the login page
      if (errorCode === "ORG_SUSPENDED" && typeof window !== "undefined") {
        handleOrgSuspended();
        return Promise.reject(new ApiError(statusCode, msg, errors, errorCode));
      }

      // Global handler: show toast for usage limit errors
      if (errorCode === "USAGE_LIMIT_EXCEEDED" && typeof window !== "undefined") {
        const metricType = (details as any)?.metricType as string | undefined;
        const metricLabel = metricType ? (METRIC_LABELS[metricType] ?? metricType.toLowerCase().replace("_", " ")) : "resource";
        const current = (details as any)?.currentValue;
        const limit = (details as any)?.limitValue;
        const limitText = limit != null ? ` (${current}/${limit})` : "";
        toast.error(`Plan limit reached: ${metricLabel}${limitText}. Upgrade your plan to continue.`, {
          duration: 6000,
          action: {
            label: "Upgrade",
            onClick: () => { window.location.href = "/settings/billing"; },
          },
        });
      }

      return Promise.reject(new ApiError(statusCode, msg, errors, errorCode, details as Record<string, unknown>));
    }

    return Promise.reject(
      new ApiError(0, error.message || "Network error. Please try again."),
    );
  },
);

/**
 * The org was suspended (API error or socket push): clear the session and send
 * the user to the login page, which explains why. Skipped on the auth pages
 * themselves so a failed login just shows the message inline.
 */
export function handleOrgSuspended(): void {
  if (typeof window === "undefined" || window.location.pathname.startsWith("/auth")) return;
  const { useAuthStore } = require("@/stores/auth-store");
  useAuthStore.getState().clearAuth();
  window.location.href = "/auth/login?suspended=1";
}

export default apiClient;
