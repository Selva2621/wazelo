"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuthStore } from "@/stores/auth-store";
import { useInboxStore } from "@/stores/inbox-store";
import { useOrgSettings } from "@/hooks/use-settings";
import { InboxView } from "@/components/inbox/inbox-view";
import { InboxScopeSelect, type InboxScope } from "@/components/inbox/inbox-scope-select";
import { WebsiteInbox } from "@/components/inbox/website-inbox";

/** URL → whose chats: /inbox (mine), ?view=all, ?view=team, ?userId=…&userName=… */
function scopeFromParams(params: URLSearchParams, me: string | undefined): InboxScope {
  const userId = params.get("userId");
  const userName = params.get("userName");
  if (userId && userId !== me) return { kind: "user", userId, userName: userName ?? "Teammate" };
  const view = params.get("view");
  if (view === "all" || view === "team") return { kind: view };
  return { kind: "mine" };
}

function scopeToUrl(scope: InboxScope) {
  if (scope.kind === "user") {
    return `/inbox?userId=${encodeURIComponent(scope.userId)}&userName=${encodeURIComponent(scope.userName)}`;
  }
  return scope.kind === "mine" ? "/inbox" : `/inbox?view=${scope.kind}`;
}

export default function InboxPage() {
  usePageTitle("Inbox");
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const setSelectedConversation = useInboxStore((s) => s.setSelectedConversation);
  const { data: orgSettings } = useOrgSettings();
  const autoSelectPhone = searchParams.get("phone");

  // Inbox → Website: chats from the website chat widget (everyone who reads the inbox)
  if (searchParams.get("channel") === "website") {
    return <WebsiteInbox />;
  }

  const role = user?.role;
  // Employee: only their own chats, no switcher
  if (role !== "ADMIN" && role !== "MANAGER") {
    return <InboxView autoSelectPhone={autoSelectPhone} />;
  }

  // Freelancers work alone: only their own chats, no "Viewing" switcher.
  // Hidden until settings load so it doesn't flash in for them.
  const showSwitcher = !!orgSettings && orgSettings.orgType !== "FREELANCER";

  // Admin/Manager: open straight on chats; "Viewing" switches whose
  let scope: InboxScope = showSwitcher ? scopeFromParams(searchParams, user?.id) : { kind: "mine" };
  if (scope.kind === "all" && role !== "ADMIN") scope = { kind: "mine" };
  if (scope.kind === "team" && role !== "MANAGER") scope = { kind: "mine" };

  // Admins with no target see the whole workspace, so "My chats" pins their own id
  const targetUserId = scope.kind === "user" ? scope.userId : scope.kind === "mine" && role === "ADMIN" ? user?.id : undefined;

  return (
    <InboxView
      key={scope.kind === "user" ? scope.userId : scope.kind}
      targetUserId={targetUserId}
      targetUserName={scope.kind === "user" ? scope.userName : undefined}
      isAdminView={scope.kind === "user"}
      teamView={scope.kind === "team"}
      autoSelectPhone={autoSelectPhone}
      scopeControl={
        showSwitcher && <InboxScopeSelect
          role={role}
          scope={scope}
          onChange={(next) => {
            setSelectedConversation(null);
            router.push(scopeToUrl(next));
          }}
        />
      }
    />
  );
}
