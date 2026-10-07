import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  getSuperAdminToken,
  useSuperAdminAuthStore,
  type SuperAdminInfo,
} from "@/stores/super-admin-auth-store";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

const superAdminClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    "x-requested-with": "XMLHttpRequest",
  },
  withCredentials: true,
});

interface SessionResponse {
  accessToken: string;
  expiresIn: number;
  superAdmin: SuperAdminInfo;
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Exchange the HttpOnly refresh cookie for a new access token.
 * Concurrent callers share one request. Resolves null when there is no valid session.
 */
export function refreshSuperAdminSession(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post<{ data: SessionResponse }>(`${baseURL}/super-admin/auth/refresh`, null, {
        withCredentials: true,
        headers: { "x-requested-with": "XMLHttpRequest" },
      })
      .then((r) => {
        const { accessToken, superAdmin } = r.data.data;
        useSuperAdminAuthStore.getState().setAuth(superAdmin, accessToken);
        return accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

superAdminClient.interceptors.request.use((config) => {
  const token = getSuperAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

superAdminClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = original?.url?.includes("/super-admin/auth/");

    // Access token expired → refresh once and replay the request
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      const token = await refreshSuperAdminSession();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return superAdminClient(original);
      }
      useSuperAdminAuthStore.getState().clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/super-admin/login";
      }
    }
    return Promise.reject(error);
  },
);

export default superAdminClient;
