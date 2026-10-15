"use client";

import type { ComponentProps } from "react";
import { useOrgMembers } from "@/hooks/use-contacts";
import { useAdminSessions } from "@/hooks/use-whatsapp";

type SelectProps = Omit<ComponentProps<"select">, "children">;

/** Picks a connected WhatsApp number; empty value means the contact's own session. */
export function SessionSelect(props: SelectProps) {
  const { data } = useAdminSessions({ status: "CONNECTED" });
  const sessions = data?.sessions ?? [];

  return (
    <select {...props}>
      <option value="">Automatic (the number the contact last chatted with)</option>
      {sessions.map((s) => {
        const owner = (s as { user?: { firstName?: string } }).user?.firstName;
        return (
          <option key={s.id} value={s.id}>
            {s.phoneNumber || "Unknown number"}{owner ? ` (${owner})` : ""}
          </option>
        );
      })}
    </select>
  );
}

/** Picks a team member to assign contacts to. */
export function MemberSelect(props: SelectProps) {
  const { data: members } = useOrgMembers();

  return (
    <select {...props}>
      <option value="">Choose a team member</option>
      {(members ?? []).map((m) => (
        <option key={m.id} value={m.id}>
          {`${m.firstName} ${m.lastName}`.trim() || m.email}
        </option>
      ))}
    </select>
  );
}
