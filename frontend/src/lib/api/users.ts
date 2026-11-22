import apiClient from "./client";

export interface OrgUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  status: string;
  lastLoginAt: string | null;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  createdAt: string;
}

export interface UsersListResponse {
  users: OrgUser[];
  total: number;
  take: number;
  skip: number;
}

export interface Invitation {
  id: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  createdAt: string;
}

export interface InviteUserRequest {
  email: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
}

export interface ChangeRoleRequest {
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export const usersApi = {
  list: (params?: { role?: string; status?: string }) =>
    apiClient
      .get<UsersListResponse>("/users", { params })
      .then((r) => r.data),

  getById: (userId: string) =>
    apiClient.get<OrgUser>(`/users/${userId}`).then((r) => r.data),

  create: (data: CreateUserRequest) =>
    apiClient.post<OrgUser>("/users", data).then((r) => r.data),

  invite: (data: InviteUserRequest) =>
    apiClient.post("/users/invite", data).then((r) => r.data),

  listInvitations: () =>
    apiClient.get<Invitation[]>("/users/invitations").then((r) => r.data),

  revokeInvitation: (invitationId: string) =>
    apiClient.delete(`/users/invitations/${invitationId}`).then((r) => r.data),

  changeRole: (userId: string, data: ChangeRoleRequest) =>
    apiClient.patch(`/users/${userId}/role`, data).then((r) => r.data),

  disable: (userId: string) =>
    apiClient.patch(`/users/${userId}/disable`).then((r) => r.data),

  enable: (userId: string) =>
    apiClient.patch(`/users/${userId}/enable`).then((r) => r.data),

  delete: (userId: string) =>
    apiClient.delete(`/users/${userId}`).then((r) => r.data),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.patch<OrgUser>("/users/me", data).then((r) => r.data),

  /** Your own WhatsApp number and "account updates on WhatsApp" consent */
  getMyWhatsapp: () =>
    apiClient.get<MyWhatsapp>("/users/me/whatsapp").then((r) => r.data),

  setMyWhatsapp: (data: { phone: string; whatsappOptIn: boolean }) =>
    apiClient.put<MyWhatsapp>("/users/me/whatsapp", data).then((r) => r.data),

  /** Confirming your own WhatsApp number with a code from Wazelo (optional) */
  getWhatsappVerification: () =>
    apiClient.get<WhatsappVerification>("/users/me/whatsapp/verification").then((r) => r.data),

  sendWhatsappCode: () =>
    apiClient.post<{ sent: true; expiresInSeconds: number }>("/users/me/whatsapp/verification/send").then((r) => r.data),

  confirmWhatsappCode: (code: string) =>
    apiClient.post<{ verified: true }>("/users/me/whatsapp/verification/confirm", { code }).then((r) => r.data),

  changePassword: (data: ChangePasswordRequest) =>
    apiClient.patch("/auth/change-password", data).then((r) => r.data),
};

export interface WhatsappVerification {
  phone: string | null;
  verified: boolean;
  /** Wazelo can send codes right now (otherwise the step is hidden) */
  available: boolean;
}

export interface MyWhatsapp {
  phone: string | null;
  whatsappOptIn: boolean;
}
