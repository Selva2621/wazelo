"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rbacApi, auditApi } from "@/lib/api/rbac";
import type {
  UserRole,
  UpdateRolePermissionsRequest,
  AssignPermissionRequest,
  RevokePermissionRequest,
  QueryAuditLogsParams,
  Permission,
  PermissionGroup,
} from "@/lib/types/rbac";
import { RESOURCE_LABELS } from "@/lib/types/rbac";

// ─── Permissions Query ──────────────────────────
export function usePermissions() {
  return useQuery({
    queryKey: ["rbac", "permissions"],
    queryFn: () => rbacApi.getPermissions(),
    staleTime: 5 * 60 * 1000, // permissions don't change often
  });
}

// ─── Role Permissions Query ─────────────────────
export function useRolePermissions() {
  return useQuery({
    queryKey: ["rbac", "role-permissions"],
    queryFn: () => rbacApi.getRolePermissions(),
    staleTime: 0,
  });
}

// ─── Update Role Permissions (bulk replace) ─────
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateRolePermissionsRequest) =>
      rbacApi.updateRolePermissions(data),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["rbac", "role-permissions"] });
    },
  });
}

// ─── Toggle Single Permission ───────────────────
export function useTogglePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      granted,
      ...data
    }: (AssignPermissionRequest | RevokePermissionRequest) & {
      granted: boolean;
    }) => (granted ? rbacApi.assignPermission(data) : rbacApi.revokePermission(data)),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["rbac", "role-permissions"] });
    },
  });
}

// ─── Audit Logs Query ───────────────────────────
export function useAuditLogs(params?: QueryAuditLogsParams) {
  return useQuery({
    queryKey: ["audit", "logs", params],
    queryFn: () => auditApi.getLogs(params),
    refetchInterval: 30_000,
  });
}

// ─── Helper: Group permissions by resource ──────
export function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const groupMap = new Map<string, Permission[]>();

  for (const p of permissions) {
    const existing = groupMap.get(p.resource) ?? [];
    existing.push(p);
    groupMap.set(p.resource, existing);
  }

  // Preserve resource order
  const resourceOrder = [
    "contacts",
    "messages",
    "conversations",
    "campaigns",
    "scheduler",
    "automation",
    "whatsapp",
    "users",
    "org",
    "rbac",
    "audit",
    "dead_letters",
  ];

  const groups: PermissionGroup[] = [];
  for (const resource of resourceOrder) {
    const perms = groupMap.get(resource);
    if (perms) {
      groups.push({
        resource,
        label: RESOURCE_LABELS[resource] ?? resource,
        permissions: perms,
      });
    }
  }

  return groups;
}
