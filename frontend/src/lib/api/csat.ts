import apiClient from "./client";
import axios from "axios";
import type { CsatStats, CsatListResponse, CsatStatsParams } from "@/lib/types/csat";

const publicClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1",
});

export const csatApi = {
  getStats: (params?: CsatStatsParams) =>
    apiClient.get<CsatStats>("/csat/stats", { params }).then((r) => r.data),

  listSurveys: (params?: { take?: number; skip?: number; agentId?: string }) =>
    apiClient
      .get<CsatListResponse>("/csat/surveys", { params })
      .then((r) => r.data),

  sendSurvey: (data: {
    conversationId: string;
    contactPhone: string;
    sessionId?: string;
    channelType?: string;
  }) => apiClient.post("/csat/send", data).then((r) => r.data),

  // Public — no auth
  getSurvey: (conversationId: string) =>
    publicClient
      .get<{ conversationId: string; alreadySubmitted: boolean; rating: number | null } | { error: string }>(
        `/csat/respond/${conversationId}`,
      )
      .then((r) => r.data),

  submitSurvey: (conversationId: string, rating: number, comment?: string) =>
    publicClient
      .post(`/csat/respond/${conversationId}`, { rating, comment })
      .then((r) => r.data),
};
