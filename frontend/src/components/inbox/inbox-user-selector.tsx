"use client";

import { useState } from "react";
import { Users, UsersRound, MessageSquare, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUsers } from "@/hooks/use-users";
import { useTeams } from "@/hooks/use-teams";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { OrgUser } from "@/lib/api/users";
import type { Team } from "@/lib/types/teams";

interface InboxUserSelectorProps {
  role: "ADMIN" | "MANAGER";
  onSelectUser: (userId: string, userName: string) => void;
}

type ViewMode = "users" | "teams";

export function InboxUserSelector({ role, onSelectUser }: InboxUserSelectorProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [viewMode, setViewMode] = useState<ViewMode>(role === "MANAGER" ? "teams" : "users");
  const [search, setSearch] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const { data: usersData, isLoading: usersLoading } = useUsers();
  const { data: teamsData, isLoading: teamsLoading } = useTeams();

  const users = usersData?.users ?? [];
  const teams = (teamsData ?? []) as Team[];

  const filteredUsers = users.filter((u) => {
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
  });

  // For manager: only show their team members
  const managerTeams = role === "MANAGER"
    ? teams.filter((t) => t.managerId === currentUserId)
    : teams;

  return (
    <div className="flex h-[calc(100vh-var(--header-height))]">
      {/* User/Team List */}
      <div className="w-full max-w-3xl mx-auto p-6 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-[20px] font-semibold text-on-surface">Inbox</h2>
          <p className="text-[13px] text-on-surface-variant mt-1">
            {role === "ADMIN"
              ? "Select a user or team to view their conversations"
              : "Select a team member to view their conversations"}
          </p>
        </div>

        {/* View Toggle (Admin only — managers just see teams) */}
        {role === "ADMIN" && (
          <div className="flex gap-1 p-1 bg-surface-container rounded-lg w-fit">
            <button
              onClick={() => setViewMode("users")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                viewMode === "users"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              <Users className="h-4 w-4" />
              All Users
            </button>
            <button
              onClick={() => setViewMode("teams")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                viewMode === "teams"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              <UsersRound className="h-4 w-4" />
              By Team
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-outline-variant/20 bg-surface-container text-on-surface text-[13px] placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          {viewMode === "users" ? (
            // ─── All Users List ───
            usersLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" className="text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <EmptyMessage text="No users found" />
            ) : (
              filteredUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUserId}
                  onClick={() =>
                    onSelectUser(user.id, `${user.firstName} ${user.lastName}`)
                  }
                />
              ))
            )
          ) : (
            // ─── Teams View ───
            teamsLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" className="text-primary" />
              </div>
            ) : managerTeams.length === 0 ? (
              <EmptyMessage text="No teams found" />
            ) : (
              managerTeams.map((team) => (
                <TeamSection
                  key={team.id}
                  team={team}
                  expanded={expandedTeam === team.id}
                  onToggle={() =>
                    setExpandedTeam((prev) => (prev === team.id ? null : team.id))
                  }
                  onSelectUser={onSelectUser}
                  search={search}
                  currentUserId={currentUserId}
                />
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function UserRow({
  user,
  isSelf,
  onClick,
}: {
  user: OrgUser;
  isSelf: boolean;
  onClick: () => void;
}) {
  const name = `${user.firstName} ${user.lastName}`;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-outline-variant/10 hover:border-outline-variant/25 bg-surface-container-lowest hover:bg-surface-container transition-colors group"
    >
      <Avatar name={name} size="sm" />
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-on-surface truncate">
            {name}
          </span>
          {isSelf && (
            <span className="text-[11px] text-on-surface-variant">(you)</span>
          )}
        </div>
        <span className="text-[12px] text-on-surface-variant truncate block">
          {user.email}
        </span>
      </div>
      <Badge
        variant={user.role === "ADMIN" ? "primary" : user.role === "MANAGER" ? "warning" : "muted"}
        className="shrink-0"
      >
        {user.role}
      </Badge>
      <MessageSquare className="h-4 w-4 text-on-surface-variant/40 group-hover:text-primary transition-colors shrink-0" />
      <ChevronRight className="h-4 w-4 text-on-surface-variant/30 group-hover:text-on-surface-variant transition-colors shrink-0" />
    </button>
  );
}

function TeamSection({
  team,
  expanded,
  onToggle,
  onSelectUser,
  search,
  currentUserId,
}: {
  team: Team;
  expanded: boolean;
  onToggle: () => void;
  onSelectUser: (userId: string, userName: string) => void;
  search: string;
  currentUserId: string | undefined;
}) {
  const members = team.members.filter((m) => {
    if (!search) return true;
    const name = `${m.user.firstName} ${m.user.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase()) || m.user.email.toLowerCase().includes(search.toLowerCase());
  });

  // If searching and no members match, hide the team
  if (search && members.length === 0) return null;

  return (
    <div className="border border-outline-variant/10 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors"
      >
        <UsersRound className="h-5 w-5 text-primary" />
        <div className="flex-1 text-left">
          <span className="text-[14px] font-medium text-on-surface">{team.name}</span>
          <span className="text-[12px] text-on-surface-variant ml-2">
            {team.members.length} member{team.members.length !== 1 ? "s" : ""}
          </span>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 text-on-surface-variant transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-outline-variant/10 divide-y divide-outline-variant/10">
          {/* Manager row */}
          <button
            onClick={() =>
              onSelectUser(
                team.manager.id,
                `${team.manager.firstName} ${team.manager.lastName}`,
              )
            }
            className="w-full flex items-center gap-3 px-4 py-2.5 pl-12 hover:bg-surface-container transition-colors group"
          >
            <Avatar
              name={`${team.manager.firstName} ${team.manager.lastName}`}
              size="sm"
            />
            <div className="flex-1 min-w-0 text-left">
              <span className="text-[13px] font-medium text-on-surface truncate block">
                {team.manager.firstName} {team.manager.lastName}
                {team.manager.id === currentUserId && (
                  <span className="text-on-surface-variant ml-1">(you)</span>
                )}
              </span>
            </div>
            <Badge variant="warning" className="shrink-0 text-[10px]">
              Manager
            </Badge>
            <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant/30 group-hover:text-on-surface-variant transition-colors shrink-0" />
          </button>

          {/* Member rows */}
          {members.map((member) => (
            <button
              key={member.id}
              onClick={() =>
                onSelectUser(
                  member.user.id,
                  `${member.user.firstName} ${member.user.lastName}`,
                )
              }
              className="w-full flex items-center gap-3 px-4 py-2.5 pl-12 hover:bg-surface-container transition-colors group"
            >
              <Avatar
                name={`${member.user.firstName} ${member.user.lastName}`}
                size="sm"
              />
              <div className="flex-1 min-w-0 text-left">
                <span className="text-[13px] text-on-surface truncate block">
                  {member.user.firstName} {member.user.lastName}
                  {member.user.id === currentUserId && (
                    <span className="text-on-surface-variant ml-1">(you)</span>
                  )}
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant/30 group-hover:text-on-surface-variant transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <Users className="h-10 w-10 text-on-surface-variant/30 mx-auto mb-3" />
      <p className="text-[13px] text-on-surface-variant">{text}</p>
    </div>
  );
}
