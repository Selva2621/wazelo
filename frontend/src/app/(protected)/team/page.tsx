"use client";

import { useRouter } from "next/navigation";
import { Users, MessageSquare } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useTeams } from "@/hooks/use-teams";
import { useAdminSessions } from "@/hooks/use-whatsapp";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StartHint, ZeroNote } from "@/components/ui/start-hint";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { Team } from "@/lib/types/teams";

type MemberRow = Team["members"][number] & { teamName: string };

export default function ManagerTeamPage() {
  usePageTitle("My team");
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "ADMIN";
  const { data: teams, isLoading } = useTeams();
  const { data: sessionsData } = useAdminSessions();

  const sessions = sessionsData?.sessions ?? [];
  const sessionByUser = new Map(
    sessions.map((s: { userId: string; status: string; phoneNumber: string | null }) => [
      s.userId,
      s,
    ]),
  );

  const allMembers =
    teams?.flatMap((t) =>
      t.members.map((m) => ({
        ...m,
        teamName: t.name,
      })),
    ) ?? [];

  const isEmpty = !isLoading && allMembers.length === 0;
  const connectedCount = allMembers.filter(
    (m) => (sessionByUser.get(m.user.id) as { status: string } | undefined)?.status === "CONNECTED",
  ).length;

  const stats = [
    { label: "Teams", value: isLoading ? "—" : (teams?.length ?? 0).toString() },
    { label: "Members", value: isLoading ? "—" : allMembers.length.toString() },
    { label: "WhatsApp connected", value: isLoading ? "—" : connectedCount.toString() },
  ];

  const columns: DataTableColumn<MemberRow>[] = [
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
          <div>
            <p className="text-body-lg font-medium text-on-surface">
              {member.user.firstName} {member.user.lastName}
            </p>
            <p className="text-label text-on-surface-variant">
              {member.user.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "team",
      header: "Team",
      skeleton: "badge",
      cell: (member) => <Badge variant="info">{member.teamName}</Badge>,
    },
    {
      id: "whatsapp",
      header: "WhatsApp",
      skeleton: "badge",
      cell: (member) => {
        const session = sessionByUser.get(member.user.id) as
          | { status: string; phoneNumber: string | null }
          | undefined;
        return !session ? (
          <Badge variant="default" dot>No session</Badge>
        ) : session.status === "CONNECTED" ? (
          <Badge variant="success" dot>Connected</Badge>
        ) : (
          <Badge variant="warning" dot>
            {session.status.charAt(0) + session.status.slice(1).toLowerCase().replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      skeleton: "none",
      cell: (member) => {
        const session = sessionByUser.get(member.user.id) as
          | { status: string; phoneNumber: string | null }
          | undefined;
        return (
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              router.push(`/team/members/${member.user.id}/inbox`)
            }
            disabled={!session || session.status !== "CONNECTED"}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            View inbox
          </Button>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        className="max-lg:hidden"
        title="My team"
        count={isLoading ? undefined : allMembers.length}
      />

      {isEmpty && (
        <StartHint
          icon={<Users />}
          title="No team members yet"
          description={
            isAdmin
              ? "Add people to a team to see them here."
              : "Ask an admin to add members to your team."
          }
          action={
            isAdmin ? (
              <Button size="sm" onClick={() => router.push("/admin/teams")}>
                Manage teams
              </Button>
            ) : undefined
          }
        />
      )}

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 max-lg:rounded-xl max-lg:p-3"
          >
            <p className="text-label text-on-surface-variant max-lg:text-caption">{s.label}</p>
            <p className="text-headline font-semibold tabular-nums text-on-surface">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        <DataTable
          label="Team members"
          columns={columns}
          rows={allMembers}
          rowKey={(m) => m.id}
          rowLabel={(m) => `${m.user.firstName} ${m.user.lastName}`}
          loading={isLoading}
          skeletonRows={6}
        />
        {isEmpty && <ZeroNote>Members appear here</ZeroNote>}
      </div>
    </div>
  );
}
