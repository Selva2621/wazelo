import apiClient from "./client";

export interface AiCreditWallet {
  plan: {
    used: number;
    /** 0 when unlimited */
    limit: number;
    unlimited: boolean;
    remaining: number | null;
    resetsAt: string | null;
  };
  /** Bought credits left; they never expire */
  purchased: number;
  /** Plan remaining + purchased; null when the plan is unlimited */
  available: number | null;
}

export interface AiCreditPackOffer {
  id: string;
  name: string;
  credits: number;
  /** Minor units */
  priceInCents: number;
  currency: string;
}

export interface AiCreditsOverview {
  wallet: AiCreditWallet;
  currency: string;
  packs: AiCreditPackOffer[];
  costs: { action: string; label: string; cost: number }[];
}

export interface AiCreditEntry {
  id: string;
  kind: "PURCHASE" | "USAGE";
  action: string | null;
  label: string | null;
  planCredits: number;
  /** Signed: + bought, − spent */
  purchasedCredits: number;
  createdAt: string;
}

export const aiCreditsApi = {
  get: () => apiClient.get<AiCreditsOverview>("/billing/ai-credits").then((r) => r.data),

  history: (page: number, limit = 20) =>
    apiClient
      .get<{ entries: AiCreditEntry[]; total: number; page: number; limit: number }>("/billing/ai-credits/history", {
        params: { page, limit },
      })
      .then((r) => r.data),

  createOrder: (packId: string) =>
    apiClient
      .post<{ orderId: string; amount: number; currency: string; packName: string; credits: number }>(
        "/billing/ai-credits/orders",
        { packId },
      )
      .then((r) => r.data),

  verify: (data: { orderId: string; razorpayPaymentId: string; signature: string }) =>
    apiClient
      .post<{ credited: boolean; credits: number; wallet: AiCreditWallet }>("/billing/ai-credits/verify", data)
      .then((r) => r.data),
};
