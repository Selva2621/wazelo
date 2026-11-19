import apiClient from "./client";
import type { TourProgressEntry } from "@/lib/tours/types";

/** Tour progress is kept per user and per device (same device id as browser push). */
export const toursApi = {
  list: (deviceId: string) =>
    apiClient
      .get<{ deviceId: string; tours: TourProgressEntry[] }>(`/tours/progress/${deviceId}`)
      .then((r) => r.data),

  save: (deviceId: string, tourId: string, status: TourProgressEntry["status"], version: number) =>
    apiClient
      .put<TourProgressEntry>(`/tours/progress/${deviceId}/${tourId}`, { status, version })
      .then((r) => r.data),

  /** Replay one tour, or every tour when tourId is left out */
  reset: (deviceId: string, tourId?: string) =>
    apiClient
      .delete<{ removed: number }>(`/tours/progress/${deviceId}${tourId ? `/${tourId}` : ""}`)
      .then((r) => r.data),
};
