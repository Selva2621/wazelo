// ─── Permission Definition ───────────────────
export interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: string;
}

// ─── Role Permission Assignment ──────────────
export interface RolePermission {
  id: string;
  orgId: string;
  role: UserRole;
  permissionId: string;
  grantedById: string | null;
  createdAt: string;
  permission: Permission;
}

export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

// ─── API Response Types ──────────────────────
export interface RolePermissionsMap {
  [role: string]: RolePermission[];
}

// ─── Request Types ───────────────────────────
export interface UpdateRolePermissionsRequest {
  role: UserRole;
  permissionIds: string[];
}

export interface AssignPermissionRequest {
  role: UserRole;
  permissionId: string;
}

export interface RevokePermissionRequest {
  role: UserRole;
  permissionId: string;
}

// ─── Audit Log Types ─────────────────────────
export interface AuditLog {
  id: string;
  action: string;
  userId: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  take: number;
  skip: number;
}

export interface QueryAuditLogsParams {
  action?: string;
  userId?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  take?: number;
  skip?: number;
}

// ─── Permission Grouping (for UI) ────────────
export interface PermissionGroup {
  resource: string;
  label: string;
  permissions: Permission[];
}

// Resource display labels
export const RESOURCE_LABELS: Record<string, string> = {
  contacts: "Contacts",
  messages: "Messages",
  conversations: "Conversations",
  campaigns: "Campaigns",
  scheduler: "Scheduled Messages",
  automation: "Automation",
  whatsapp: "WhatsApp",
  users: "Users",
  org: "Organization",
  rbac: "Roles & Permissions",
  audit: "Audit Logs",
  dead_letters: "Dead Letters",
};

// Action display labels
export const ACTION_LABELS: Record<string, string> = {
  read: "View",
  create: "Create",
  update: "Edit",
  delete: "Delete",
  assign: "Assign",
  merge: "Merge",
  export: "Export",
  send: "Send",
  execute: "Execute",
  cancel: "Cancel",
  invite: "Invite",
  change_role: "Change Role",
  disable: "Disable",
  logs_read: "View Logs",
  session_own: "Own Session",
  session_view_all: "View All Sessions",
  session_admin: "Admin Sessions",
  reprocess: "Reprocess",
};
