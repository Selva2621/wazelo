"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  MessageSquare,
  UserPlus,
  Shield,
  Ban,
  CheckCircle,
  Trash2,
  Mail,
  X,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useUsers,
  useCreateUser,
  useInvitations,
  useRevokeInvitation,
  useChangeRole,
  useDisableUser,
  useEnableUser,
  useDeleteUser,
} from "@/hooks/use-users";
import { useAdminSessions } from "@/hooks/use-whatsapp";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { OrgUser } from "@/lib/api/users";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/layout/page-header";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

/** "QR_PENDING" → "Qr pending" */
const sentenceCase = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

function SessionStatusBadge({ status }: { status?: string }) {
  if (!status) return <Badge variant="default" dot>No session</Badge>;
  if (status === "CONNECTED") return <Badge variant="success" dot>Connected</Badge>;
  return <Badge variant="warning" dot>{sentenceCase(status)}</Badge>;
}

function UserStatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge variant="success" dot>Active</Badge>;
  if (status === "SUSPENDED") return <Badge variant="error" dot>Disabled</Badge>;
  if (status === "LOCKED") return <Badge variant="warning" dot>Locked</Badge>;
  return <Badge variant="muted" dot>{sentenceCase(status)}</Badge>;
}

export default function AdminUsersPage() {
  usePageTitle("Users");
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const { data: usersData, isLoading: usersLoading } = useUsers();
  const { data: sessionsData } = useAdminSessions();
  const { data: invitations } = useInvitations();

  const createUser = useCreateUser();
  const revokeInvitation = useRevokeInvitation();
  const changeRole = useChangeRole();
  const disableUser = useDisableUser();
  const enableUser = useEnableUser();
  const deleteUser = useDeleteUser();

  // Create user form state
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "EMPLOYEE" as Role,
  });
  const [formError, setFormError] = useState("");

  // Role change state
  const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<Role>("EMPLOYEE");

  const users = usersData?.users ?? [];
  const sessions = sessionsData?.sessions ?? [];
  const pendingInvites = (invitations ?? []).filter(
    (inv) => inv.status === "PENDING",
  );

  const sessionByUser = new Map(
    sessions.map((s: { userId: string; status: string; phoneNumber: string | null }) => [
      s.userId,
      s,
    ]),
  );

  const handleCreateUser = () => {
    setFormError("");
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.password) {
      setFormError("All fields are required");
      return;
    }
    if (formData.password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }
    createUser.mutate(
      {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setFormData({ firstName: "", lastName: "", email: "", password: "", role: "EMPLOYEE" });
          setFormError("");
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setFormError(Array.isArray(msg) ? msg[0] : msg || "Failed to create user");
        },
      },
    );
  };

  const handleChangeRole = (userId: string) => {
    changeRole.mutate(
      { userId, data: { role: newRole } },
      { onSuccess: () => setChangingRoleUserId(null) },
    );
  };

  const columns: DataTableColumn<OrgUser>[] = [
    {
      id: "user",
      header: "User",
      skeleton: "avatar",
      cell: (user) => {
        const isSelf = user.id === currentUser?.id;
        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                name={`${user.firstName} ${user.lastName}`}
                size="sm"
              />
              {user.isOnline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface-container-lowest" />
              )}
            </div>
            <div>
              <p className="text-body-lg font-medium text-on-surface">
                {user.firstName} {user.lastName}
                {isSelf && (
                  <span className="text-caption text-on-surface-variant ml-1.5">
                    (you)
                  </span>
                )}
              </p>
              <p className="text-label text-on-surface-variant">
                {user.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "role",
      header: "Role",
      skeleton: "badge",
      cell: (user) => {
        const isSelf = user.id === currentUser?.id;
        return changingRoleUserId === user.id ? (
          <div className="flex items-center gap-1.5">
            <select
              value={newRole}
              onChange={(e) =>
                setNewRole(e.target.value as Role)
              }
              className="rounded-md border border-outline-variant/20 bg-surface px-2 py-1 text-label text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              onClick={() => handleChangeRole(user.id)}
              className="text-caption text-primary hover:text-primary/80 font-medium"
            >
              Save
            </button>
            <button
              onClick={() => setChangingRoleUserId(null)}
              className="text-caption text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (!isSelf) {
                setChangingRoleUserId(user.id);
                setNewRole(user.role);
              }
            }}
            disabled={isSelf}
            className="group flex items-center gap-1.5"
            title={isSelf ? "Cannot change own role" : "Click to change role"}
          >
            <Badge
              variant={
                user.role === "ADMIN"
                  ? "primary"
                  : user.role === "MANAGER"
                    ? "info"
                    : "default"
              }
            >
              {sentenceCase(user.role)}
            </Badge>
            {!isSelf && (
              <Shield className="h-3 w-3 text-on-surface-variant/30 group-hover:text-primary transition-colors" />
            )}
          </button>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      skeleton: "badge",
      cell: (user) => <UserStatusBadge status={user.status} />,
    },
    {
      id: "whatsapp",
      header: "WhatsApp",
      skeleton: "badge",
      cell: (user) => {
        const session = sessionByUser.get(user.id) as
          | { status: string; phoneNumber: string | null }
          | undefined;
        return (
          <div className="flex items-center gap-2">
            <SessionStatusBadge status={session?.status} />
            {session?.phoneNumber && (
              <span className="text-caption text-on-surface-variant">
                {session.phoneNumber}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      skeleton: "none",
      cell: (user) => {
        const session = sessionByUser.get(user.id) as
          | { status: string; phoneNumber: string | null }
          | undefined;
        const isSelf = user.id === currentUser?.id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* View Inbox */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                router.push(`/admin/users/${user.id}/inbox`)
              }
              disabled={
                !session || session.status !== "CONNECTED"
              }
              title="View inbox"
              aria-label="View inbox"
              className="max-lg:size-10"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>

            {/* Disable / Enable */}
            {!isSelf && (
              <>
                {user.status === "ACTIVE" ? (
                  <IconButton size="xs"
                    onClick={() => disableUser.mutate(user.id)}
                    className="hover:text-warning hover:bg-warning/10 max-lg:size-10"
                    title="Disable user" aria-label="Disable user">
                    <Ban className="h-3.5 w-3.5" />
                  </IconButton>
                ) : user.status === "SUSPENDED" ? (
                  <IconButton size="xs"
                    onClick={() => enableUser.mutate(user.id)}
                    className="hover:text-success hover:bg-success/10 max-lg:size-10"
                    title="Enable user" aria-label="Enable user">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </IconButton>
                ) : null}

                {/* Delete */}
                <IconButton size="xs" variant="danger"
                  onClick={() => {
                    if (
                      confirm(
                        `Delete ${user.firstName} ${user.lastName}? This cannot be undone.`,
                      )
                    ) {
                      deleteUser.mutate(user.id);
                    }
                  }}
                  className="max-lg:size-10"
                  title="Delete user" aria-label="Delete user">
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Phones/tablets: the iOS nav bar carries the title and the + button */}
      <MobilePageActions
        primary={{ label: "Create user", onClick: () => setShowCreate(true) }}
      />
      <PageHeader
        className="max-lg:hidden"
        title="Users"
        count={users.length}
        actions={
          <Button onClick={() => setShowCreate(true)} disabled={showCreate}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Create user
          </Button>
        }
      />

      {/* Create user form */}
      {showCreate && (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-body-lg font-semibold text-on-surface">
              Create new user
            </h2>
            <IconButton size="xs"
              onClick={() => { setShowCreate(false); setFormError(""); }} aria-label="Close">
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          {formError && (
            <div className="rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-body text-error">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant">
                First name
              </label>
              <input
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-body text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant">
                Last name
              </label>
              <input
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-body text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-label font-medium text-on-surface-variant">
              Email address
            </label>
            <input
              type="email"
              placeholder="john.doe@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-body text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant">
                Password
              </label>
              <input
                type="password"
                placeholder="Min 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-body text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={handleCreateUser} disabled={createUser.isPending}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              {createUser.isPending ? "Creating..." : "Create user"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setShowCreate(false); setFormError(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <div data-tour="admin-invites" className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          <div className="flex items-baseline gap-2 border-b border-outline-variant px-4 py-2.5">
            <h2 className="text-body font-semibold text-on-surface">Pending invitations</h2>
            <span className="text-label tabular-nums text-on-surface-variant">{pendingInvites.length}</span>
          </div>
          <div className="divide-y divide-outline-variant/60">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-4 py-2.5 max-lg:gap-3 max-lg:py-3"
              >
                <div className="flex items-center gap-3 max-lg:min-w-0 max-lg:flex-wrap max-lg:gap-x-2 max-lg:gap-y-1">
                  <Mail className="h-4 w-4 text-on-surface-variant/50" />
                  <span className="text-body text-on-surface max-lg:min-w-0 max-lg:break-all">
                    {inv.email}
                  </span>
                  <Badge
                    variant={
                      inv.role === "ADMIN"
                        ? "primary"
                        : inv.role === "MANAGER"
                          ? "info"
                          : "default"
                    }
                  >
                    {sentenceCase(inv.role)}
                  </Badge>
                  <span className="text-caption text-on-surface-variant">
                    Expires{" "}
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => revokeInvitation.mutate(inv.id)}
                  className="rounded text-label text-error outline-none transition-colors hover:text-error/80 focus-visible:ring-2 focus-visible:ring-focus max-lg:min-h-11 max-lg:shrink-0 max-lg:px-1"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users table */}
      {!usersLoading && users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-16 w-16" />}
          title="No users found"
          description="Invite users to your organization to get started."
          actionLabel="Invite user"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          <DataTable
            label="Users"
            columns={columns}
            rows={users}
            rowKey={(u) => u.id}
            rowLabel={(u) => `${u.firstName} ${u.lastName}`}
            loading={usersLoading}
            skeletonRows={6}
          />
        </div>
      )}
    </div>
  );
}
