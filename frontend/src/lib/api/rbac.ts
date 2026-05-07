import apiClient from "./client";
import type {
  Permission,
  RolePermissionsMap,
  UpdateRolePermissionsRequest,
  AssignPermissionRequest,
  RevokePermissionRequest,
  AuditLogsResponse,
  QueryAuditLogsParams,
} from "@/lib/types/rbac";

export const rbacApi = {
  // ─── Permissions ─────────────────────────────
  getPermissions: async () => {
    const r = await apiClient.get<{ permissions: Permission[]; total: number }>("/rbac/permissions");
    return r.data.permissions;
  },

  // ─── Role Permissions ────────────────────────
  getRolePermissions: async () => {
    const r = await apiClient.get<{ rolePermissions: RolePermissionsMap } | RolePermissionsMap>("/rbac/role-permissions");
    // Backend wraps response in { rolePermissions: {...} }
    const data = r.data as any;
    return (data.rolePermissions ?? data) as RolePermissionsMap;
  },

  updateRolePermissions: async (data: UpdateRolePermissionsRequest) => {
    const r = await apiClient.put("/rbac/role-permissions", data);
    return r.data;
  },

  assignPermission: async (data: AssignPermissionRequest) => {
    const r = await apiClient.post("/rbac/assign", data);
    return r.data;
  },

  revokePermission: async (data: RevokePermissionRequest) => {
    const r = await apiClient.post("/rbac/revoke", data);
    return r.data;
  },
};

export const auditApi = {
  // ─── Audit Logs ──────────────────────────────
  getLogs: async (params?: QueryAuditLogsParams) => {
    const r = await apiClient.get<AuditLogsResponse>("/audit/logs", { params });
    return r.data as AuditLogsResponse;
  },
};
