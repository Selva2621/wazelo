import axios from "axios";
import { getSuperAdminToken, useSuperAdminAuthStore } from "@/stores/super-admin-auth-store";

const superAdminClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
    "x-requested-with": "XMLHttpRequest",
  },
  withCredentials: true,
});

superAdminClient.interceptors.request.use((config) => {
  const token = getSuperAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

superAdminClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useSuperAdminAuthStore.getState().clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/super-admin/login";
      }
    }
    return Promise.reject(error);
  },
);

export default superAdminClient;
