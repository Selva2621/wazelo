import apiClient from "./client";

/** A lead given to me that nobody has contacted yet */
export interface MyLead {
  id: string;
  contactId: string;
  contactName: string | null;
  contactPhone: string;
  productId: string | null;
  productName: string | null;
  assignedAt: string;
  /** Reminder time */
  dueAt: string;
  overdue: boolean;
}

export const leadFollowUpsApi = {
  mine: () => apiClient.get<MyLead[]>("/lead-follow-ups/mine").then((r) => r.data),
  called: (id: string) => apiClient.post(`/lead-follow-ups/${id}/called`).then((r) => r.data),
};
