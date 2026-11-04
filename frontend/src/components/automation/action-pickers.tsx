"use client";

import { Select, type SelectProps as UiSelectProps } from "@/components/ui/select";
import { useOrgMembers } from "@/hooks/use-contacts";
import { useAdminSessions } from "@/hooks/use-whatsapp";
import { usePipelines } from "@/hooks/use-deals";
import { useSequences } from "@/hooks/use-sequences";

type SelectProps = Omit<UiSelectProps, "children">;

/** Picks a connected WhatsApp number; empty value means the contact's own session. */
export function SessionSelect(props: SelectProps) {
  const { data } = useAdminSessions({ status: "CONNECTED" });
  const sessions = data?.sessions ?? [];

  return (
    <Select {...props}>
      <option value="">Automatic (the number the contact last chatted with)</option>
      {sessions.map((s) => {
        const owner = (s as { user?: { firstName?: string } }).user?.firstName;
        return (
          <option key={s.id} value={s.id}>
            {s.phoneNumber || "Unknown number"}{owner ? ` (${owner})` : ""}
          </option>
        );
      })}
    </Select>
  );
}

/** Picks a deal stage; empty value means any stage. */
export function StageSelect(props: SelectProps) {
  const { data: pipelines } = usePipelines();
  const list = pipelines ?? [];

  return (
    <Select {...props}>
      <option value="">Any stage</option>
      {list.map((p) =>
        list.length === 1 ? (
          p.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
        ) : (
          <optgroup key={p.id} label={p.name}>
            {p.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </optgroup>
        ),
      )}
    </Select>
  );
}

/**
 * Picks a running sequence — only those can take new contacts.
 * `anyLabel`: the empty choice means "every sequence" (e.g. Stop sequence).
 */
export function SequenceSelect({ anyLabel, ...props }: SelectProps & { anyLabel?: string }) {
  const { data } = useSequences({ take: 100 });
  const running = (data?.data ?? []).filter((s) => s.status === "ACTIVE" || s.status === "PAUSED");

  return (
    <Select {...props}>
      <option value="">
        {anyLabel ?? (running.length ? "Choose a sequence" : "No running sequences — start one first")}
      </option>
      {running.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}{s.status === "PAUSED" ? " (paused)" : ""}
        </option>
      ))}
    </Select>
  );
}

/** Picks a team member to assign contacts to. */
export function MemberSelect(props: SelectProps) {
  const { data: members } = useOrgMembers();

  return (
    <Select {...props}>
      <option value="">Choose a team member</option>
      {(members ?? []).map((m) => (
        <option key={m.id} value={m.id}>
          {`${m.firstName} ${m.lastName}`.trim() || m.email}
        </option>
      ))}
    </Select>
  );
}
