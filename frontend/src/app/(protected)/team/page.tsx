"use client";

import { useRouter } from "next/navigation";
import { Users, MessageSquare, Wifi, WifiOff, Minus } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useTeams } from "@/hooks/use-teams";
import { useAdminSessions } from "@/hooks/use-whatsapp";
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

export default function ManagerTeamPage() {
  usePageTitle("My Team");
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

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  const allMembers =
    teams?.flatMap((t) =>
      t.members.map((m) => ({
        ...m,
        teamName: t.name,
      })),
    ) ?? [];

  if (allMembers.length === 0) {
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-on-surface">My Team</h1>
        <p className="text-[13px] text-on-surface-variant mt-0.5">
          View and manage your team members&apos; WhatsApp inboxes
        </p>
      </div>

      <div className="rounded-xl border border-outline-variant/15 overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Member</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {allMembers.map((member) => {
              const session = sessionByUser.get(member.user.id) as
                | { status: string; phoneNumber: string | null }
                | undefined;
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={`${member.user.firstName} ${member.user.lastName}`}
                        size="sm"
                      />
                      <div>
                        <p className="text-[14px] font-medium text-on-surface">
                          {member.user.firstName} {member.user.lastName}
                        </p>
                        <p className="text-[12px] text-on-surface-variant">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">{member.teamName}</Badge>
                  </TableCell>
                  <TableCell>
                    {!session ? (
                      <Badge variant="default" className="gap-1">
                        <Minus className="h-3 w-3" />
                        No Session
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
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        router.push(`/team/members/${member.user.id}/inbox`)
                      }
                      disabled={!session || session.status !== "CONNECTED"}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      View Inbox
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
