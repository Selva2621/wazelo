"use client";

import { useRouter } from "next/navigation";
import { Users, MessageSquare, Wifi, WifiOff, Minus } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useTeams } from "@/hooks/use-teams";
import { useAdminSessions } from "@/hooks/use-whatsapp";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { Team } from "@/lib/types/teams";

type MemberRow = Team["members"][number] & { teamName: string };

export default function ManagerTeamPage() {
  usePageTitle("My team");
  const router = useRouter();
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

  if (!isLoading && allMembers.length === 0) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <EmptyState
          icon={<Users className="h-16 w-16" />}
          title="No team members"
          description="Your team has no members yet. Ask an admin to assign members to your team."
        />
      </div>
    );
  }

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
          <Badge variant="default" className="gap-1">
            <Minus className="h-3 w-3" />
            No session
          </Badge>
        ) : session.status === "CONNECTED" ? (
          <Badge variant="success" className="gap-1">
            <Wifi className="h-3 w-3" />
            Connected
          </Badge>
        ) : (
          <Badge variant="warning" className="gap-1">
            <WifiOff className="h-3 w-3" />
            {session.status}
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
      <PageHeader className="max-lg:hidden" title="My team" count={allMembers.length} />

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
      </div>
    </div>
  );
}
