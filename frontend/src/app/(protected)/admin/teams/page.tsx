"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Users, Eye } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useTeams, useCreateTeam, useDeleteTeam } from "@/hooks/use-teams";
import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
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
import { PAGE_SIZE } from "@/lib/constants";
import { IconButton } from "@/components/ui/icon-button";

export default function AdminTeamsPage() {
  usePageTitle("Teams");
  const router = useRouter();
  const { data: teams, isLoading } = useTeams();
  const { data: usersData } = useUsers();
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamManagerId, setNewTeamManagerId] = useState("");
  const [createError, setCreateError] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Search + pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const users = usersData?.users ?? [];
  const managers = users.filter((u) => u.role === "MANAGER" || u.role === "ADMIN");

  const allTeams = (teams ?? []) as Team[];
  const filtered = allTeams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      `${t.manager.firstName} ${t.manager.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedTeams = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCreateTeam = () => {
    setCreateError("");
    if (!newTeamName.trim() && !newTeamManagerId) {
      setCreateError("Team name and manager are required");
      return;
    }
    if (!newTeamName.trim()) {
      setCreateError("Team name is required");
      return;
    }
    if (!newTeamManagerId) {
      setCreateError("Please select a manager");
      return;
    }
    createTeam.mutate(
      { name: newTeamName.trim(), managerId: newTeamManagerId },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewTeamName("");
          setNewTeamManagerId("");
          setCreateError("");
        },
        onError: (err: unknown) => {
          const msg = (err as { message?: string })?.message;
          setCreateError(msg || "Failed to create team");
        },
      },
    );
  };

  const closeCreate = () => {
    setShowCreate(false);
    setCreateError("");
    setNewTeamName("");
    setNewTeamManagerId("");
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title font-semibold text-on-surface">Teams</h1>
          <p className="text-body text-on-surface-variant mt-0.5">
            Manage your organization&apos;s teams and members
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={showCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Team
        </Button>
      </div>

      {/* Create team form */}
      {showCreate && (
        <div className="rounded-xl border border-outline-variant/15 p-5 space-y-4 bg-surface-container/30">
          <div className="flex items-center justify-between">
            <h3 className="text-body-lg font-semibold text-on-surface">New Team</h3>
            <IconButton size="xs"
              onClick={closeCreate} aria-label="Close">
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          {createError && (
            <div className="rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-body text-error">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant">Team Name</label>
              <input
                type="text"
                placeholder="e.g. Support Team"
                value={newTeamName}
                onChange={(e) => { setNewTeamName(e.target.value); setCreateError(""); }}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-body text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant">Manager</label>
              <select
                value={newTeamManagerId}
                onChange={(e) => { setNewTeamManagerId(e.target.value); setCreateError(""); }}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select manager</option>
                {managers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleCreateTeam} disabled={createTeam.isPending}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {createTeam.isPending ? "Creating..." : "Create Team"}
            </Button>
            <Button variant="secondary" size="sm" onClick={closeCreate}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      {allTeams.length > 0 && (
        <SearchInput
          placeholder="Search by team name or manager..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      )}

      {/* Empty states */}
      {allTeams.length === 0 ? (
        <EmptyState
          icon={<Users className="h-16 w-16" />}
          title="No teams yet"
          description="Create your first team to organize your employees."
          actionLabel="Create Team"
          onAction={() => setShowCreate(true)}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-16 w-16" />}
          title="No teams match your search"
          description={`No teams found for "${search}".`}
          actionLabel="Clear search"
          onAction={() => handleSearchChange("")}
        />
      ) : (
        <>
          <div className="rounded-xl border border-outline-variant/15 overflow-hidden">
            <Table>
              <TableHeader>
                <TableHeaderRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </TableHeaderRow>
              </TableHeader>
              <TableBody>
                {pagedTeams.map((team) => (
                  <TableRow
                    key={team.id}
                    onClick={() => router.push(`/admin/teams/${team.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <span className="text-body-lg font-medium text-on-surface">
                        {team.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={`${team.manager.firstName} ${team.manager.lastName}`}
                          size="sm"
                        />
                        <div>
                          <p className="text-body text-on-surface">
                            {team.manager.firstName} {team.manager.lastName}
                          </p>
                          <p className="text-caption text-on-surface-variant">{team.manager.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">
                        {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-label text-on-surface-variant">
                        {new Date(team.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconButton size="xs"
                          onClick={() => router.push(`/admin/teams/${team.id}`)}
                          className="hover:text-primary hover:bg-primary/10"
                          title="View / Edit team" aria-label="View / Edit team">
                          <Eye className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton size="xs" variant="danger"
                          onClick={() => setDeleteTarget({ id: team.id, name: team.name })}
                         
                          title="Delete team" aria-label="Delete team">
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Team"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteTeam.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteTeam.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
