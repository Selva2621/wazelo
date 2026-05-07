"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuthStore } from "@/stores/auth-store";
import { InboxView } from "@/components/inbox/inbox-view";
import { InboxUserSelector } from "@/components/inbox/inbox-user-selector";

export default function InboxPage() {
  usePageTitle("Inbox");
  const router = useRouter();
  const searchParams = useSearchParams();
  const userRole = useAuthStore((s) => s.user?.role);

  const isAdminOrManager = userRole === "ADMIN" || userRole === "MANAGER";

  // Persist selected user in URL: /inbox?userId=xxx&userName=xxx
  const targetUserId = searchParams.get("userId");
  const targetUserName = searchParams.get("userName");
  const autoSelectPhone = searchParams.get("phone");

  // Employee: show their own inbox directly
  if (!isAdminOrManager) {
    return <InboxView autoSelectPhone={autoSelectPhone} />;
  }

  // Admin/Manager with a selected user: show that user's conversations
  if (targetUserId && targetUserName) {
    return (
      <InboxView
        targetUserId={targetUserId}
        targetUserName={targetUserName}
        isAdminView
        onBack={() => router.push("/inbox")}
        autoSelectPhone={autoSelectPhone}
      />
    );
  }

  // Admin/Manager: show user selector
  return (
    <InboxUserSelector
      role={userRole as "ADMIN" | "MANAGER"}
      onSelectUser={(id: string, name: string) => {
        router.push(`/inbox?userId=${encodeURIComponent(id)}&userName=${encodeURIComponent(name)}`);
      }}
    />
  );
}
