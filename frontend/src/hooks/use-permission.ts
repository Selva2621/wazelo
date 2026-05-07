"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRolePermissions } from "./use-rbac";
import type { RolePermission } from "@/lib/types/rbac";

/**
 * Hook to check if the current user has a specific permission.
 * ADMIN role always returns true (bypass).
 *
 * Usage:
 *   const canEdit = useHasPermission("contacts:update");
 *   const canManage = useHasAnyPermission(["campaigns:create", "campaigns:execute"]);
 */
// Normalize permission key from either flat { resource, action } or nested { permission: { resource, action } }
function permKey(rp: any): string {
  if (rp.permission) return `${rp.permission.resource}:${rp.permission.action}`;
  return `${rp.resource}:${rp.action}`;
}

export function useHasPermission(permission: string): boolean {
  const user = useAuthStore((s) => s.user);
  const { data: rolePermissions } = useRolePermissions();

  return useMemo(() => {
    if (!user) return false;
    if (user.role === "ADMIN") return true;

    if (!rolePermissions) return false;
    const rps: RolePermission[] = rolePermissions[user.role] ?? [];
    return rps.some((rp) => permKey(rp) === permission);
  }, [user, rolePermissions, permission]);
}

export function useHasAnyPermission(permissions: string[]): boolean {
  const user = useAuthStore((s) => s.user);
  const { data: rolePermissions } = useRolePermissions();

  return useMemo(() => {
    if (!user) return false;
    if (user.role === "ADMIN") return true;

    if (!rolePermissions) return false;
    const rps: RolePermission[] = rolePermissions[user.role] ?? [];
    const grantedSet = new Set(rps.map(permKey));
    return permissions.some((p) => grantedSet.has(p));
  }, [user, rolePermissions, permissions]);
}

export function useHasAllPermissions(permissions: string[]): boolean {
  const user = useAuthStore((s) => s.user);
  const { data: rolePermissions } = useRolePermissions();

  return useMemo(() => {
    if (!user) return false;
    if (user.role === "ADMIN") return true;

    if (!rolePermissions) return false;
    const rps: RolePermission[] = rolePermissions[user.role] ?? [];
    const grantedSet = new Set(rps.map(permKey));
    return permissions.every((p) => grantedSet.has(p));
  }, [user, rolePermissions, permissions]);
}
