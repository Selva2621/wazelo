"use client";

import { useState, useMemo, useCallback } from "react";
import { Shield, Lock, RotateCcw, Save } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  usePermissions,
  useRolePermissions,
  useUpdateRolePermissions,
  groupPermissions,
} from "@/hooks/use-rbac";
import { useAuthStore } from "@/stores/auth-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import type { UserRole, RolePermission } from "@/lib/types/rbac";
import { ACTION_LABELS } from "@/lib/types/rbac";

const EDITABLE_ROLES: UserRole[] = ["MANAGER", "EMPLOYEE"];
const ALL_ROLES: UserRole[] = ["ADMIN", "MANAGER", "EMPLOYEE"];

export default function RolesPermissionsPage() {
  usePageTitle("Roles & Permissions");

  const user = useAuthStore((s) => s.user);
  const { data: permissions, isLoading: loadingPerms } = usePermissions();
  const { data: rolePermissions, isLoading: loadingRolePerms } = useRolePermissions();
  const updateMutation = useUpdateRolePermissions();

  // Track local changes (unsaved state)
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, Set<string>>
  >({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Build the current permission ID sets per role from API data
  const serverRolePermIds = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    if (rolePermissions) {
      for (const role of ALL_ROLES) {
        const rps: RolePermission[] = rolePermissions[role] ?? [];
        map[role] = new Set(rps.map((rp) => rp.permissionId ?? (rp as any).id));
      }
    }
    return map;
  }, [rolePermissions]);

  // Effective permission sets: pending changes override server data
  const effectivePermIds = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const role of ALL_ROLES) {
      map[role] = pendingChanges[role] ?? serverRolePermIds[role] ?? new Set();
    }
    return map;
  }, [pendingChanges, serverRolePermIds]);

  // Group permissions for display
  const groups = useMemo(() => {
    if (!permissions) return [];
    return groupPermissions(permissions);
  }, [permissions]);

  // Check if permission is granted for a role
  const isGranted = useCallback(
    (role: UserRole, permissionId: string) => {
      if (role === "ADMIN") return true; // ADMIN always has all
      return effectivePermIds[role]?.has(permissionId) ?? false;
    },
    [effectivePermIds],
  );

  // Toggle a permission for a role
  const togglePermission = useCallback(
    (role: UserRole, permissionId: string) => {
      if (role === "ADMIN") return; // Can't modify ADMIN

      setPendingChanges((prev) => {
        const current = prev[role] ?? serverRolePermIds[role] ?? new Set();
        const next = new Set(current);
        if (next.has(permissionId)) {
          next.delete(permissionId);
        } else {
          next.add(permissionId);
        }
        return { ...prev, [role]: next };
      });
      setSaveSuccess(false);
      setSaveError(null);
    },
    [serverRolePermIds],
  );

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    for (const role of EDITABLE_ROLES) {
      if (pendingChanges[role]) {
        const server = serverRolePermIds[role] ?? new Set();
        const pending = pendingChanges[role];
        if (server.size !== pending.size) return true;
        for (const id of pending) {
          if (!server.has(id)) return true;
        }
      }
    }
    return false;
  }, [pendingChanges, serverRolePermIds]);

  // Reset to server state
  const resetChanges = useCallback(() => {
    setPendingChanges({});
    setSaveSuccess(false);
    setSaveError(null);
  }, []);

  // Save all changed roles
  const saveChanges = useCallback(async () => {
    setSaveError(null);
    setSaveSuccess(false);

    try {
      for (const role of EDITABLE_ROLES) {
        if (pendingChanges[role]) {
          await updateMutation.mutateAsync({
            role,
            permissionIds: Array.from(pendingChanges[role]),
          });
        }
      }
      setPendingChanges({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setSaveError(apiErr.message ?? "Failed to save changes");
    }
  }, [pendingChanges, updateMutation]);

  // Guard: ADMIN only
  if (user?.role !== "ADMIN") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Shield className="h-12 w-12 text-on-surface-variant/40 mx-auto mb-3" />
          <p className="text-[14px] text-on-surface-variant">
            You don&apos;t have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  const isLoading = loadingPerms || loadingRolePerms;

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] text-on-surface-variant mb-1">
            Admin &gt; Roles &amp; Permissions
          </p>
          <h1 className="text-2xl font-semibold text-on-surface">
            Roles &amp; Permissions
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-1">
            Manage what each role can access in your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetChanges}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={saveChanges}
            disabled={!hasChanges}
            loading={updateMutation.isPending}
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Success / Error alerts */}
      {saveSuccess && (
        <Alert variant="success">Permissions updated successfully.</Alert>
      )}
      {saveError && <Alert variant="error">{saveError}</Alert>}

      {/* Permission Matrix */}
      <Card className="!p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" className="text-primary" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="h-10 w-10 text-on-surface-variant/40 mb-3" />
            <p className="text-[14px] text-on-surface-variant">
              No permissions found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Sticky Header */}
              <thead className="sticky top-0 z-10">
                <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant min-w-[300px]">
                    Permission
                  </th>
                  {ALL_ROLES.map((role) => (
                    <th
                      key={role}
                      className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant w-[140px]"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {role === "ADMIN" && (
                          <Lock className="h-3 w-3 text-on-surface-variant/60" />
                        )}
                        {role}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <GroupRows
                    key={group.resource}
                    group={group}
                    isGranted={isGranted}
                    togglePermission={togglePermission}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Info footer */}
        <div className="px-5 py-3 border-t border-outline-variant/15 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-on-surface-variant/50" />
          <span className="text-[11px] text-on-surface-variant/60">
            Admin role always has full access and cannot be modified.
          </span>
        </div>
      </Card>
    </div>
  );
}

// ─── Group Rows Component ─────────────────────
function GroupRows({
  group,
  isGranted,
  togglePermission,
}: {
  group: { resource: string; label: string; permissions: { id: string; action: string; description: string | null }[] };
  isGranted: (role: UserRole, permissionId: string) => boolean;
  togglePermission: (role: UserRole, permissionId: string) => void;
}) {
  return (
    <>
      {/* Group header */}
      <tr className="bg-surface-container/20">
        <td
          colSpan={4}
          className="px-5 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-on-surface-variant"
        >
          {group.label}
        </td>
      </tr>
      {/* Permission rows */}
      {group.permissions.map((perm, idx) => (
        <tr
          key={perm.id}
          className={`border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/15 transition-colors ${
            idx % 2 === 0 ? "" : "bg-surface-container/5"
          }`}
        >
          <td className="px-5 py-3">
            <div>
              <span className="text-[13px] font-medium text-on-surface">
                {ACTION_LABELS[perm.action] ?? perm.action}
              </span>
              {perm.description && (
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  {perm.description}
                </p>
              )}
            </div>
          </td>
          {ALL_ROLES.map((role) => (
            <td key={role} className="px-5 py-3 text-center">
              <ToggleSwitch
                checked={isGranted(role, perm.id)}
                disabled={role === "ADMIN"}
                onChange={() => togglePermission(role, perm.id)}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Toggle Switch Component ──────────────────
function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`
        relative inline-flex h-5 w-9 items-center rounded-full transition-colors
        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 focus:ring-offset-surface
        ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        ${checked ? "bg-primary" : "bg-surface-container-high"}
      `}
    >
      <span
        className={`
          inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm
          ${checked ? "translate-x-[18px]" : "translate-x-[3px]"}
        `}
      />
      {disabled && checked && (
        <Lock className="absolute -right-5 h-3 w-3 text-on-surface-variant/40" />
      )}
    </button>
  );
}
