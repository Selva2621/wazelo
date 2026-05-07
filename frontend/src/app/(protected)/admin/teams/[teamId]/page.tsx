"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Pencil,
  X,
  Check,
  UserPlus,
  UserMinus,
  Users,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useTeams,
  useUpdateTeam,
  useAddTeamMember,
  useRemoveTeamMember,
} from "@/hooks/use-teams";
import { useUsers } from "@/hooks/use-users";
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
import type { Team } from "@/lib/types/teams";

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const router = useRouter();

  const { data: teams, isLoading } = useTeams();
  const { data: usersData } = useUsers();
  const updateTeam = useUpdateTeam();
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editManagerId, setEditManagerId] = useState("");
  const [editError, setEditError] = useState("");

  // Add member
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState("");

  const allTeams = (teams ?? []) as Team[];
  const team = allTeams.find((t) => t.id === teamId);

  usePageTitle(team ? team.name : "Team");

  const users = usersData?.users ?? [];
  const managers = users.filter((u) => u.role === "MANAGER" || u.role === "ADMIN");
  const availableToAdd = users.filter(
    (u) =>
      !team?.members.some((m) => m.user.id === u.id) &&
      u.id !== team?.managerId,
  );

  const handleStartEdit = () => {
    if (!team) return;
    setEditName(team.name);
    setEditManagerId(team.managerId);
    setEditError("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError("");
    setAddingMember(false);
    setNewMemberUserId("");
  };

  const handleSaveEdit = () => {
    if (!team) return;
    setEditError("");
    if (!editName.trim()) {
      setEditError("Team name is required");
      return;
    }
    updateTeam.mutate(
      { id: team.id, data: { name: editName.trim(), managerId: editManagerId } },
      {
        onSuccess: () => setIsEditing(false),
        onError: (err: unknown) => {
          const msg = (err as { message?: string })?.message;
          setEditError(msg || "Failed to update team");
        },
      },
    );
  };

  const handleAddMember = () => {
    if (!team || !newMemberUserId) return;
    addMember.mutate(
      { teamId: team.id, data: { userId: newMemberUserId } },
      {
        onSuccess: () => {
          setAddingMember(false);
          setNewMemberUserId("");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Users className="h-16 w-16" />}
          title="Team not found"
          description="This team may have been deleted or does not exist."
          actionLabel="Back to Teams"
          onAction={() => router.push("/admin/teams")}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px]">
        <button
          onClick={() => router.push("/admin/teams")}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Teams
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant/40" />
        <span className="text-on-surface font-medium">{team.name}</span>
      </nav>

      {/* Team info card */}
      <div className="rounded-xl border border-outline-variant/15 overflow-hidden">
        {/* Card header */}
        <div className="flex items-start justify-between px-6 py-5 bg-surface-container/30 border-b border-outline-variant/10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => { setEditName(e.target.value); setEditError(""); }}
                    className="rounded-lg border border-outline-variant/20 bg-surface px-3 py-1.5 text-[15px] font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
                    autoFocus
                  />
                  {editError && (
                    <p className="text-[11px] text-error">{editError}</p>
                  )}
                </div>
              ) : (
                <h1 className="text-[18px] font-bold text-on-surface">{team.name}</h1>
              )}
              <p className="text-[12px] text-on-surface-variant mt-0.5">
                Created {new Date(team.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={updateTeam.isPending}
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  {updateTeam.isPending ? "Saving..." : "Save"}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleStartEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Manager row */}
        <div className="px-6 py-4 flex items-center gap-6 border-b border-outline-variant/10">
          <div className="space-y-0.5 min-w-[120px]">
            <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Manager</p>
            {isEditing ? (
              <select
                value={editManagerId}
                onChange={(e) => setEditManagerId(e.target.value)}
                className="mt-1 rounded-lg border border-outline-variant/20 bg-surface px-3 py-1.5 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {managers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <Avatar
                  name={`${team.manager.firstName} ${team.manager.lastName}`}
                  size="sm"
                />
                <div>
                  <p className="text-[13px] font-medium text-on-surface">
                    {team.manager.firstName} {team.manager.lastName}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">{team.manager.role}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-0.5">
            <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Members</p>
            <p className="text-[13px] text-on-surface mt-1">{team.members.length}</p>
          </div>

          <div className="space-y-0.5">
            <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Last Updated</p>
            <p className="text-[13px] text-on-surface mt-1">
              {new Date(team.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Members section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-on-surface">
            Members
            <span className="ml-2 text-[13px] font-normal text-on-surface-variant">
              ({team.members.length})
            </span>
          </h2>
          {isEditing && !addingMember && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAddingMember(true)}
              disabled={availableToAdd.length === 0}
              title={availableToAdd.length === 0 ? "All users are already members" : "Add member"}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Add Member
            </Button>
          )}
        </div>

        {/* Add member inline form (edit mode only) */}
        {isEditing && addingMember && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <select
              value={newMemberUserId}
              onChange={(e) => setNewMemberUserId(e.target.value)}
              className="flex-1 rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select user to add</option>
              {availableToAdd.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.role})
                </option>
              ))}
            </select>
            <Button size="sm" onClick={handleAddMember} disabled={!newMemberUserId || addMember.isPending}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Add
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setAddingMember(false); setNewMemberUserId(""); }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Members table */}
        {team.members.length === 0 ? (
          <div className="rounded-xl border border-outline-variant/15 px-6 py-10 text-center">
            <p className="text-[13px] text-on-surface-variant">
              No members yet.
              {isEditing
                ? " Click \"Add Member\" above to invite someone."
                : " Switch to Edit mode to add members."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-outline-variant/15 overflow-hidden">
            <Table>
              <TableHeader>
                <TableHeaderRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Added</TableHead>
                  {isEditing && <TableHead align="right">Remove</TableHead>}
                </TableHeaderRow>
              </TableHeader>
              <TableBody>
                {team.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={`${member.user.firstName} ${member.user.lastName}`}
                          size="sm"
                        />
                        <p className="text-[13px] font-medium text-on-surface">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.user.role === "ADMIN"
                            ? "primary"
                            : member.user.role === "MANAGER"
                              ? "info"
                              : "default"
                        }
                      >
                        {member.user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[12px] text-on-surface-variant">
                        {member.user.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[12px] text-on-surface-variant">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    {isEditing && (
                      <TableCell align="right">
                        <button
                          onClick={() =>
                            removeMember.mutate({ teamId: team.id, userId: member.user.id })
                          }
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                          title="Remove member"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
