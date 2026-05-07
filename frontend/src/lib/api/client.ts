import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import type { ApiResponse, ApiErrorResponse } from "@/lib/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

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

// Refresh lock to prevent concurrent refresh calls
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  refreshQueue = [];
}

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
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== "undefined"
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // No body needed — refresh token is sent automatically via httpOnly cookie
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { "x-requested-with": "XMLHttpRequest" },
          },
        );
        const data = res.data.data || res.data;
        const { useAuthStore } = require("@/stores/auth-store");
        useAuthStore.getState().setTokens({
          accessToken: data.accessToken,
          expiresIn: data.expiresIn,
          user: data.user,
        });

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        const { useAuthStore } = require("@/stores/auth-store");
        useAuthStore.getState().clearAuth();
        return Promise.reject(
          new ApiError(401, "Session expired. Please log in again."),
        );
      } finally {
        isRefreshing = false;
      }
    }

    // Transform error to ApiError
    if (error.response?.data) {
      const { statusCode, message, errors, error: errorCode, details } = error.response.data;
      const msg = Array.isArray(message) ? message[0] : message;

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

export default apiClient;
