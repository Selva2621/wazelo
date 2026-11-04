"use client";

import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useDisconnectEmail, useSendTestEmail } from "@/hooks/use-email";
import type { EmailAccount } from "@/lib/api/email";
import { cn } from "@/lib/utils";
import { getProvider } from "./email-settings-guide";
import { emailErrorText } from "./email-settings-form";

const STATUS: Record<EmailAccount["status"], { label: string; variant: "success" | "error" | "warning" }> = {
  ACTIVE: { label: "Connected", variant: "success" },
  ERROR: { label: "Needs attention", variant: "error" },
  UNVERIFIED: { label: "Not verified", variant: "warning" },
};

interface Props {
  account: EmailAccount;
  canManage: boolean;
  onEdit: () => void;
}

/** The connected business email: who it sends as, today's sending, and test / edit / disconnect */
export function EmailSettingsStatus({ account, canManage, onEdit }: Props) {
  const sendTest = useSendTestEmail();
  const disconnect = useDisconnectEmail();
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherTo, setOtherTo] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const status = STATUS[account.status];
  const pct = account.dailyLimit > 0 ? Math.min(100, Math.round((account.sentToday / account.dailyLimit) * 100)) : 0;

  const runTest = async (to?: string) => {
    try {
      const { sentTo } = await sendTest.mutateAsync(to);
      toast.success(`Test email sent to ${sentTo}`);
      setOtherOpen(false);
      setOtherTo("");
    } catch (err) {
      toast.error(emailErrorText(err, "The test email didn't send."));
    }
  };

  const onOtherSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (otherTo.trim()) void runTest(otherTo.trim());
  };

  const onDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success("Email disconnected");
      setConfirmOpen(false);
    } catch (err) {
      toast.error(emailErrorText(err, "Couldn't disconnect. Try again."));
    }
  };

  return (
    <section
      data-tour="email-status"
      aria-labelledby="email-status-heading"
      className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 lg:p-5"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Mail className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 id="email-status-heading" className="truncate text-body-lg font-semibold text-on-surface">
              {account.fromName}
            </h2>
            <Badge variant={status.variant} dot>
              {status.label}
            </Badge>
          </div>
          <p className="truncate text-body text-on-surface-variant">
            {account.fromAddress} · {getProvider(account.provider).label}
          </p>
        </div>
      </div>

      {account.status === "ERROR" && account.lastError && (
        <p role="alert" className="mt-3 rounded-xl bg-error-container px-3 py-2.5 text-body text-error">
          {account.lastError}
        </p>
      )}

      <div className="mt-4">
        <p className="text-body text-on-surface">
          <span className="font-semibold tabular-nums">{account.sentToday.toLocaleString("en-IN")}</span>
          <span className="tabular-nums text-on-surface-variant"> / {account.dailyLimit.toLocaleString("en-IN")} sent today</span>
        </p>
        <div
          role="progressbar"
          aria-label="Sent today"
          aria-valuemin={0}
          aria-valuemax={account.dailyLimit}
          aria-valuenow={account.sentToday}
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container-highest"
        >
          <div className={cn("h-full rounded-full", pct >= 100 ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-caption text-on-surface-variant">At the limit, sending pauses and resumes tomorrow.</p>
      </div>

      {canManage && (
        <>
          <div className="mt-4 flex flex-wrap gap-2 max-lg:grid max-lg:grid-cols-2">
            <Button
              variant="secondary"
              loading={sendTest.isPending && !otherOpen}
              disabled={sendTest.isPending}
              onClick={() => void runTest()}
              className="max-lg:col-span-2 max-lg:h-11"
            >
              Send test email
            </Button>
            <Button variant="secondary" onClick={onEdit} className="max-lg:h-11">
              Edit
            </Button>
            <Button variant="ghost" onClick={() => setConfirmOpen(true)} className="text-error hover:text-error max-lg:h-11">
              Disconnect
            </Button>
          </div>

          {otherOpen ? (
            <form onSubmit={onOtherSubmit} className="mt-3 flex gap-2 max-sm:flex-col">
              <label htmlFor="email-test-to" className="sr-only">
                Send test to
              </label>
              <Input
                id="email-test-to"
                type="email"
                inputMode="email"
                value={otherTo}
                onChange={(e) => setOtherTo(e.target.value)}
                placeholder="name@example.com"
                autoFocus
                className="max-lg:h-11"
              />
              <div className="flex gap-2">
                <Button type="submit" loading={sendTest.isPending} disabled={!otherTo.trim()} className="max-lg:h-11 max-sm:flex-1">
                  Send
                </Button>
                <Button type="button" variant="ghost" onClick={() => setOtherOpen(false)} className="max-lg:h-11">
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setOtherOpen(true)}
              className="mt-2 min-h-11 rounded-lg text-label font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus lg:min-h-8"
            >
              Send to another address
            </button>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Disconnect email?"
        message="Campaigns, automations and sequences will stop sending email until you connect again."
        confirmLabel="Disconnect"
        loading={disconnect.isPending}
        onConfirm={() => void onDisconnect()}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
