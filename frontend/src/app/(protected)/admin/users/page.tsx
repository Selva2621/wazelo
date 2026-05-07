"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  MessageSquare,
  Wifi,
  WifiOff,
  Minus,
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
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableHeader,
  TableHeaderRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

function SessionStatusBadge({ status }: { status?: string }) {
  if (!status) {
    return (
      <Badge variant="default" className="gap-1">
        <Minus className="h-3 w-3" />
        No Session
      </Badge>
    );
  }
  if (status === "CONNECTED") {
    return (
      <Badge variant="success" className="gap-1">
        <Wifi className="h-3 w-3" />
        Connected
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1">
      <WifiOff className="h-3 w-3" />
      {status}
    </Badge>
  );
}

function UserStatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge variant="success">Active</Badge>;
  if (status === "SUSPENDED") return <Badge variant="error">Disabled</Badge>;
  if (status === "LOCKED") return <Badge variant="warning">Locked</Badge>;
  return <Badge variant="muted">{status}</Badge>;
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

  if (usersLoading) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-on-surface">Users</h1>
          <p className="text-[13px] text-on-surface-variant mt-0.5">
            Manage org users, roles, and WhatsApp sessions
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={showCreate}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          Create User
        </Button>
      </div>

      {/* Create user form */}
      {showCreate && (
        <div className="rounded-xl border border-outline-variant/15 p-5 space-y-4 bg-surface-container/30">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-on-surface">
              Create New User
            </h3>
            <button
              onClick={() => { setShowCreate(false); setFormError(""); }}
              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <div className="rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-[13px] text-error">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant">
                First Name
              </label>
              <input
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant">
                Last Name
              </label>
              <input
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-on-surface-variant">
              Email Address
            </label>
            <input
              type="email"
              placeholder="john.doe@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant">
                Password
              </label>
              <input
                type="password"
                placeholder="Min 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              {createUser.isPending ? "Creating..." : "Create User"}
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
        <div className="rounded-xl border border-outline-variant/15 overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-container/40 border-b border-outline-variant/10">
            <h3 className="text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Pending Invitations ({pendingInvites.length})
            </h3>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-on-surface-variant/50" />
                  <span className="text-[13px] text-on-surface">
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
                    {inv.role}
                  </Badge>
                  <span className="text-[11px] text-on-surface-variant">
                    Expires{" "}
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => revokeInvitation.mutate(inv.id)}
                  className="text-[12px] text-error hover:text-error/80 transition-colors"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users table */}
      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-16 w-16" />}
          title="No users found"
          description="Invite users to your organization to get started."
          actionLabel="Invite User"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="rounded-xl border border-outline-variant/15 overflow-hidden">
          <Table>
            <TableHeader>
              <TableHeaderRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableHeaderRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const session = sessionByUser.get(user.id) as
                  | { status: string; phoneNumber: string | null }
                  | undefined;
                const isSelf = user.id === currentUser?.id;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
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
                          <p className="text-[14px] font-medium text-on-surface">
                            {user.firstName} {user.lastName}
                            {isSelf && (
                              <span className="text-[11px] text-on-surface-variant ml-1.5">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="text-[12px] text-on-surface-variant">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {changingRoleUserId === user.id ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={newRole}
                            onChange={(e) =>
                              setNewRole(e.target.value as Role)
                            }
                            className="rounded-md border border-outline-variant/20 bg-surface px-2 py-1 text-[12px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="EMPLOYEE">Employee</option>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          <button
                            onClick={() => handleChangeRole(user.id)}
                            className="text-[11px] text-primary hover:text-primary/80 font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setChangingRoleUserId(null)}
                            className="text-[11px] text-on-surface-variant hover:text-on-surface"
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
                            {user.role}
                          </Badge>
                          {!isSelf && (
                            <Shield className="h-3 w-3 text-on-surface-variant/30 group-hover:text-primary transition-colors" />
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge status={user.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <SessionStatusBadge status={session?.status} />
                        {session?.phoneNumber && (
                          <span className="text-[11px] text-on-surface-variant">
                            {session.phoneNumber}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell align="right">
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
                          title="View Inbox"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>

                        {/* Disable / Enable */}
                        {!isSelf && (
                          <>
                            {user.status === "ACTIVE" ? (
                              <button
                                onClick={() => disableUser.mutate(user.id)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-warning hover:bg-warning/10 transition-colors"
                                title="Disable user"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            ) : user.status === "SUSPENDED" ? (
                              <button
                                onClick={() => enableUser.mutate(user.id)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-success hover:bg-success/10 transition-colors"
                                title="Enable user"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </button>
                            ) : null}

                            {/* Delete */}
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Delete ${user.firstName} ${user.lastName}? This cannot be undone.`,
                                  )
                                ) {
                                  deleteUser.mutate(user.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
