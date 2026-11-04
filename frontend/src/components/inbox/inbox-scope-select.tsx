"use client";

import { useId, useMemo } from "react";
import { Select } from "@/components/ui/select";
import { useUsers } from "@/hooks/use-users";
import { useTeams } from "@/hooks/use-teams";
import { useAuthStore } from "@/stores/auth-store";
import type { Team } from "@/lib/types/teams";

/** Whose WhatsApp chats the inbox shows */
export type InboxScope =
  | { kind: "mine" }
  | { kind: "all" } // admin: every chat in the workspace
  | { kind: "team" } // manager: everyone in their teams
  | { kind: "user"; userId: string; userName: string };

export function scopeValue(s: InboxScope) {
  return s.kind === "user" ? `user:${s.userId}` : s.kind;
}

interface Person {
  id: string;
  name: string;
}

/**
 * "Viewing: My chats ▾" — admins and managers switch whose chats they see.
 * The shared Select: keyboard type-ahead, screen-reader support and a bottom sheet on phones.
 */
export function InboxScopeSelect({
  role,
  scope,
  onChange,
}: {
  role: "ADMIN" | "MANAGER";
  scope: InboxScope;
  onChange: (scope: InboxScope) => void;
}) {
  const id = useId();
  const me = useAuthStore((s) => s.user?.id);
  const { data: usersData } = useUsers({ status: "ACTIVE" });
  const { data: teamsData } = useTeams();

  // Admin: everyone in the workspace. Manager: only their team members.
  const people = useMemo<Person[]>(() => {
    const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim();
    const list = new Map<string, Person>();

    if (role === "MANAGER") {
      for (const t of ((teamsData ?? []) as Team[]).filter((t) => t.managerId === me)) {
        for (const m of t.members) if (m.user.id !== me) list.set(m.user.id, { id: m.user.id, name: fullName(m.user) });
      }
    } else {
      for (const u of usersData?.users ?? []) {
        if (u.id !== me) list.set(u.id, { id: u.id, name: fullName(u) || u.email });
      }
    }
    return [...list.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [role, me, usersData, teamsData]);

  const value = scopeValue(scope);
  // Keep a person opened from a link (e.g. a contact's owner) selectable before the lists load
  const known = people.some((p) => `user:${p.id}` === value);

  const handle = (v: string) => {
    if (v === "mine" || v === "all" || v === "team") return onChange({ kind: v });
    const userId = v.slice("user:".length);
    const person = people.find((p) => p.id === userId);
    if (person) onChange({ kind: "user", userId, userName: person.name });
  };

  return (
    <div data-tour="inbox-scope" className="flex items-center gap-2">
      <label htmlFor={id} className="shrink-0 text-label text-on-surface-variant">
        Viewing
      </label>
      <Select
        id={id}
        size="sm"
        value={value}
        onChange={(e) => handle(e.target.value)}
        className="min-w-0 flex-1 font-medium"
      >
        <option value="mine">My chats</option>
        {role === "ADMIN" && <option value="all">Everyone&apos;s chats</option>}
        {role === "MANAGER" && <option value="team">My team&apos;s chats</option>}
        {scope.kind === "user" && !known && <option value={value}>{scope.userName}</option>}
        {/* Always shown so it's clear people can be picked here, even with no teammates yet */}
        <optgroup label={role === "MANAGER" ? "Team members" : "People"}>
          {people.length === 0 ? (
            // Non-empty value: an empty disabled option would become the placeholder and hide this note
            <option value="none" disabled>
              {role === "MANAGER" ? "No one in your team yet" : "No teammates yet. Invite them in Users"}
            </option>
          ) : (
            people.map((p) => (
              <option key={p.id} value={`user:${p.id}`}>
                {p.name}
              </option>
            ))
          )}
        </optgroup>
      </Select>
    </div>
  );
}
