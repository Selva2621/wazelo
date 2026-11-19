"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmailSettingsForm } from "@/components/email/email-settings-form";
import { EmailSettingsRecent } from "@/components/email/email-settings-recent";
import { EmailSettingsStatus } from "@/components/email/email-settings-status";
import { useEmailAccount } from "@/hooks/use-email";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuthStore } from "@/stores/auth-store";

function SkeletonBox({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-container-highest ${className ?? ""}`} />;
}

/** Settings → Email: the workspace's one business email, used by campaigns, automations and sequences */
export default function EmailSettingsPage() {
  usePageTitle("Email");
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "ADMIN";

  const { data: account, isLoading, isError, refetch } = useEmailAccount();
  const [editing, setEditing] = useState(false);

  let body;
  if (isLoading) {
    body = (
      <div className="space-y-4">
        <SkeletonBox className="h-20" />
        <SkeletonBox className="h-80" />
      </div>
    );
  } else if (isError) {
    body = (
      <div role="alert" className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 text-center">
        <p className="text-body text-on-surface">Couldn&apos;t load your email settings.</p>
        <Button variant="secondary" onClick={() => void refetch()} className="mt-3 max-lg:h-11">
          Try again
        </Button>
      </div>
    );
  } else if (!account || (editing && isAdmin)) {
    body = isAdmin ? (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 lg:p-6">
        <EmailSettingsForm
          key={account ? "edit" : "new"}
          account={account ?? null}
          onDone={() => setEditing(false)}
          onCancel={account ? () => setEditing(false) : undefined}
        />
      </div>
    ) : (
      <div
        data-tour="email-status"
        className="flex flex-col items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center"
      >
        <Mail className="h-6 w-6 text-on-surface-variant" aria-hidden />
        <p className="text-body-lg font-medium text-on-surface">No business email connected</p>
        <p className="text-body text-on-surface-variant">Ask an admin to connect one.</p>
      </div>
    );
  } else {
    body = (
      <div className="space-y-6">
        <EmailSettingsStatus account={account} canManage={isAdmin} onEdit={() => setEditing(true)} />
        <EmailSettingsRecent />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-lg:px-4 max-lg:pb-6 max-lg:pt-2 lg:p-6">
      <PageHeader title="Email" className="max-lg:hidden" />
      <div className="max-w-5xl">{body}</div>
    </div>
  );
}
