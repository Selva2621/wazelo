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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { Team } from "@/lib/types/teams";
import { IconButton } from "@/components/ui/icon-button";

type TeamMember = Team["members"][number];

/** "MANAGER" → "Manager" */
const sentenceCase = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

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
          actionLabel="Back to teams"
          onAction={() => router.push("/admin/teams")}
        />
      </div>
    );
  }

  const memberColumns: DataTableColumn<TeamMember>[] = [
    {
      id: "member",
      header: "Member",
      skeleton: "avatar",
      cell: (member) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={`${member.user.firstName} ${member.user.lastName}`}
            size="sm"
          />
          <p className="text-body font-medium text-on-surface">
            {member.user.firstName} {member.user.lastName}
          </p>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      skeleton: "badge",
      cell: (member) => (
        <Badge
          variant={
            member.user.role === "ADMIN"
              ? "primary"
              : member.user.role === "MANAGER"
                ? "info"
                : "default"
          }
        >
          {sentenceCase(member.user.role)}
        </Badge>
      ),
    },
    {
      id: "email",
      header: "Email",
      cell: (member) => (
        <span className="text-label text-on-surface-variant">
          {member.user.email}
        </span>
      ),
    },
    {
      id: "added",
      header: "Added",
      cell: (member) => (
        <span className="text-label text-on-surface-variant">
          {new Date(member.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    ...(isEditing
      ? [
          {
            id: "remove",
            header: "Remove",
            align: "right" as const,
            cell: (member: TeamMember) => (
              <IconButton size="sm" variant="danger"
                onClick={() =>
                  removeMember.mutate({ teamId: team.id, userId: member.user.id })
                }
               
                title="Remove member" aria-label="Remove member">
                <UserMinus className="h-4 w-4" />
              </IconButton>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-body max-lg:hidden">
        <button
          onClick={() => router.push("/admin/teams")}
          className="rounded text-on-surface-variant outline-none transition-colors hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus"
        >
          Teams
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant/40" />
        <span className="text-on-surface font-medium">{team.name}</span>
      </nav>

      {/* Team info card */}
      <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        {/* Card header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-outline-variant max-lg:flex-col max-lg:gap-3 max-lg:px-4 max-lg:py-4">
          <div className="flex items-center gap-4 max-lg:w-full max-lg:min-w-0 max-lg:gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 lg:hidden">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="max-lg:min-w-0 max-lg:flex-1">
              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => { setEditName(e.target.value); setEditError(""); }}
                    className="rounded-lg border border-outline-variant/20 bg-surface px-3 py-1.5 text-body-lg font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 w-64 max-lg:h-11 max-lg:w-full"
                    autoFocus
                  />
                  {editError && (
                    <p className="text-caption text-error">{editError}</p>
                  )}
                </div>
              ) : (
                <h1 className="text-headline font-semibold text-on-surface max-lg:text-title">{team.name}</h1>
              )}
              <p className="text-label text-on-surface-variant mt-0.5">
                Created {new Date(team.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 max-lg:w-full max-lg:[&>button]:h-11 max-lg:[&>button]:flex-1">
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
        <div className="px-6 py-4 flex items-center gap-6 max-lg:flex-wrap max-lg:gap-x-6 max-lg:gap-y-4 max-lg:px-4">
          <div className="space-y-0.5 min-w-[120px] max-lg:basis-full">
            <p className="text-label text-on-surface-variant">Manager</p>
            {isEditing ? (
              <select
                value={editManagerId}
                onChange={(e) => setEditManagerId(e.target.value)}
                className="mt-1 rounded-lg border border-outline-variant/20 bg-surface px-3 py-1.5 text-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 max-lg:h-11 max-lg:w-full"
              >
                {managers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({sentenceCase(u.role)})
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
                  <p className="text-body font-medium text-on-surface">
                    {team.manager.firstName} {team.manager.lastName}
                  </p>
                  <p className="text-caption text-on-surface-variant">{sentenceCase(team.manager.role)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-0.5">
            <p className="text-label text-on-surface-variant">Members</p>
            <p className="text-body text-on-surface mt-1">{team.members.length}</p>
          </div>

          <div className="space-y-0.5">
            <p className="text-label text-on-surface-variant">Last updated</p>
            <p className="text-body text-on-surface mt-1">
              {new Date(team.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Members section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-body-lg font-semibold text-on-surface">
            Members
            <span className="ml-2 text-body font-normal tabular-nums text-on-surface-variant">
              {team.members.length}
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
              Add member
            </Button>
          )}
        </div>

        {/* Add member inline form (edit mode only) */}
        {isEditing && addingMember && (
          <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 max-lg:flex-wrap max-lg:[&>button]:h-11 max-lg:[&>button]:flex-1">
            <select
              value={newMemberUserId}
              onChange={(e) => setNewMemberUserId(e.target.value)}
              className="max-lg:h-11 max-lg:basis-full flex-1 rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select user to add</option>
              {availableToAdd.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({sentenceCase(u.role)})
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
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-6 py-10 text-center">
            <p className="text-body text-on-surface-variant">
              No members yet.
              {isEditing
                ? " Click \"Add member\" above to invite someone."
                : " Switch to Edit mode to add members."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
            <DataTable
              label="Members"
              columns={memberColumns}
              rows={team.members}
              rowKey={(m) => m.id}
              rowLabel={(m) => `${m.user.firstName} ${m.user.lastName}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
