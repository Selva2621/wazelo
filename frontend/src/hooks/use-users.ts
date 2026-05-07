"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users";
import type {
  CreateUserRequest,
  InviteUserRequest,
  ChangeRoleRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "@/lib/api/users";

export const userKeys = {
  all: ["users"] as const,
  list: (params?: { role?: string; status?: string }) =>
    ["users", "list", params] as const,
  detail: (id: string) => ["users", "detail", id] as const,
  invitations: () => ["users", "invitations"] as const,
};

export function useUsers(params?: { role?: string; status?: string }) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersApi.list(params),
  });
}

export function useUser(userId: string | null) {
  return useQuery({
    queryKey: userKeys.detail(userId!),
    queryFn: () => usersApi.getById(userId!),
    enabled: !!userId,
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: userKeys.invitations(),
    queryFn: () => usersApi.listInvitations(),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteUserRequest) => usersApi.invite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => usersApi.revokeInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useChangeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: ChangeRoleRequest }) =>
      usersApi.changeRole(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useDisableUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersApi.disable(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useEnableUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersApi.enable(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersApi.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => usersApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) =>
      usersApi.changePassword(data),
  });
}
