"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useUser } from "@/hooks/use-users";
import { InboxView } from "@/components/inbox/inbox-view";
import { Spinner } from "@/components/ui/spinner";

export default function ManagerMemberInboxPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const router = useRouter();
  const { data: user, isLoading } = useUser(userId);

  const userName = user
    ? `${user.firstName} ${user.lastName}`
    : "Team Member";

  usePageTitle(`${userName}'s Inbox`);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Breadcrumb */}
      <div className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 border-b border-outline-variant/15 bg-surface-container/30">
        <button
          onClick={() => router.push("/team")}
          className="text-[13px] text-primary hover:text-primary/80 transition-colors"
        >
          My Team
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant/50" />
        <span className="text-[13px] font-medium text-on-surface">
          {userName}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant/50" />
        <span className="text-[13px] text-on-surface-variant">Inbox</span>
      </div>

      {/* Inbox */}
      <div className="flex-1 min-h-0">
        <InboxView
          targetUserId={userId}
          targetUserName={userName}
          isAdminView
        />
      </div>
    </div>
  );
}
