"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Rocket, Clock, Info, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useOutreachPermissionCount, useStartOutreach } from "@/hooks/use-sequences";
import { useSendHealth } from "@/hooks/use-whatsapp";
import { getOutreachStepsFor, hasOutreachBlanks } from "@/lib/constants/outreach";
import { useOrgSettings } from "@/hooks/use-settings";
import { useAuthStore } from "@/stores/auth-store";

interface StartOutreachModalProps {
  open: boolean;
  onClose: () => void;
  run: { id: string; keywords: string; location?: string | null; importedCount: number };
}

const delayLabel = (minutes: number) =>
  minutes === 0 ? "Right away" : `${Math.round(minutes / 1440)} day${minutes >= 2880 ? "s" : ""} later`;

/** One click from a scrape run to an automatic first-contact sequence. */
export function StartOutreachModal({ open, onClose, run }: StartOutreachModalProps) {
  return (
    <Modal open={open} onClose={onClose} aria-label="Start outreach" className="max-w-xl rounded-3xl bg-surface max-h-[90vh] flex flex-col overflow-hidden">
      {() => <OutreachForm run={run} onClose={onClose} />}
    </Modal>
  );
}

function OutreachForm({ run, onClose }: Omit<StartOutreachModalProps, "open">) {
  const router = useRouter();
  const startOutreach = useStartOutreach();
  const { data: health } = useSendHealth();
  const [name, setName] = useState(`Outreach – ${run.keywords}${run.location ? `, ${run.location}` : ""}`);
  // Freelancers: written for their line of work (chosen in onboarding); teams: in the business's voice
  const { data: orgSettings } = useOrgSettings();
  const userOrgType = useAuthStore((s) => s.user?.orgType);
  const [steps, setSteps] = useState<{ name: string; delayMinutes: number; messageBody: string }[]>(() =>
    getOutreachStepsFor({ ...orgSettings, orgType: orgSettings?.orgType ?? userOrgType }),
  );
  const [onlyNew, setOnlyNew] = useState(true);
  // Lead finder contacts get WhatsApp outreach only after they messaged you or agreed
  const { data: permission, isLoading: permissionLoading } = useOutreachPermissionCount(run.id, onlyNew);
  const nobodyPermitted = permission ? permission.withPermission === 0 : false;

  const blanks = steps.some((s) => hasOutreachBlanks(s.messageBody));
  const canStart = name.trim() && steps.every((s) => s.messageBody.trim()) && !blanks && !nobodyPermitted && !permissionLoading;

  // New-contact cap per day for this number → rough number of days to reach the permitted leads
  const perDay = health?.caps.coldCap;
  const reach = permission?.withPermission ?? run.importedCount;
  const days = perDay ? Math.ceil(reach / perDay) : null;

  const handleStart = () => {
    if (!canStart) return;
    startOutreach.mutate(
      {
        scrapeRunId: run.id,
        name: name.trim(),
        onlyNew,
        steps: steps.map((s) => ({ messageBody: s.messageBody.trim(), delayMinutes: s.delayMinutes })),
      },
      {
        onSuccess: (sequence) => {
          toast.success(`Outreach started for ${sequence.totalRecipients} lead${sequence.totalRecipients !== 1 ? "s" : ""}`);
          onClose();
          router.push("/sequences");
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
          const message = err.response?.data?.message;
          // Lead finder contacts need WhatsApp permission first, so a run often has nobody eligible yet
          toast.error(
            message === "No eligible contacts found for this audience"
              ? "No one to message yet. Lead finder contacts need to message you first, or you can record their WhatsApp permission on the contact."
              : message || "Could not start outreach",
          );
        },
      },
    );
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
        <h2 className="flex items-center gap-2 text-title font-semibold text-on-surface">
          <Rocket className="h-5 w-5 text-primary" />
          Start outreach
        </h2>
        <IconButton size="sm" onClick={onClose} aria-label="Close">
          <X className="h-5 w-5" />
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* WhatsApp permission: how many of the run's leads will actually get messages */}
        <div
          aria-live="polite"
          className={
            nobodyPermitted
              ? "flex gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-label text-on-surface"
              : "flex gap-2 rounded-xl bg-surface-container px-3 py-2.5 text-label text-on-surface-variant"
          }
        >
          <ShieldCheck className={nobodyPermitted ? "mt-0.5 h-4 w-4 shrink-0 text-warning" : "mt-0.5 h-4 w-4 shrink-0 text-primary"} />
          {permissionLoading || !permission ? (
            <p>{permissionLoading ? "Checking which leads have agreed to WhatsApp messages." : "Only leads who have agreed to WhatsApp messages get outreach."}</p>
          ) : nobodyPermitted && permission.total === 0 ? (
            <p>No leads from this run to message with these settings.</p>
          ) : nobodyPermitted ? (
            <div className="space-y-1.5">
              <p>
                <strong>0 of {permission.total} leads</strong> have agreed to WhatsApp messages, so outreach can&apos;t start yet.
              </p>
              <p className="text-on-surface-variant">
                Call or email them first and ask if you can send details on WhatsApp. When they agree, open the contact
                and record their permission. Leads who message you first count too.
              </p>
              <p className="flex flex-wrap gap-x-3 gap-y-1">
                <button type="button" onClick={onClose} className="font-medium text-primary hover:underline">
                  Back to the lead list
                </button>
                <Link href="/contacts" className="font-medium text-primary hover:underline">
                  Open contacts
                </Link>
              </p>
            </div>
          ) : (
            <p>
              <strong className="text-on-surface">
                {permission.withPermission} of {permission.total} lead{permission.total !== 1 ? "s" : ""}
              </strong>{" "}
              {permission.withPermission === 1 ? "has" : "have"} agreed to WhatsApp messages. Outreach will go to{" "}
              {permission.withPermission === 1 ? "that 1 lead" : `those ${permission.withPermission}`}.
            </p>
          )}
        </div>

        <div className="flex gap-2 rounded-xl bg-surface-container px-3 py-2.5 text-label text-on-surface-variant">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Messages go from your WhatsApp number, between 9:00 and 20:00.
            {perDay && (
              <>
                {" "}Your number can message <strong className="text-on-surface">{perDay} new contacts a day</strong>
                {days && days > 1 ? `, about ${days} days to reach everyone.` : "."}
              </>
            )}
            {" "}Anyone who replies leaves the sequence so you can take over in the inbox.
          </p>
        </div>

        <div>
          <label className="text-caption font-medium text-on-surface-variant/60 uppercase tracking-wide">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={255} className="mt-1" />
        </div>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={step.name} className="rounded-xl border border-outline-variant/20 bg-surface-container p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-label font-semibold text-on-surface">
                  Step {i + 1} · {step.name}
                </span>
                <span className="flex items-center gap-1 text-caption text-on-surface-variant">
                  <Clock className="h-3 w-3" />
                  {delayLabel(step.delayMinutes)}
                </span>
              </div>
              <textarea
                value={step.messageBody}
                onChange={(e) =>
                  setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, messageBody: e.target.value } : s)))
                }
                rows={3}
                maxLength={4096}
                className="w-full resize-none rounded-lg border border-outline-variant/20 bg-surface px-2.5 py-1.5 text-body text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
          ))}
          {blanks && (
            <p className="text-caption text-warning">
              Replace the [bracketed] parts with your own words before starting.
            </p>
          )}
          <p className="text-caption text-on-surface-variant">{"{{name}}"} is replaced with each lead&apos;s name.</p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyNew}
            onChange={(e) => setOnlyNew(e.target.checked)}
            className="rounded border-outline-variant/30 text-primary focus:ring-primary"
          />
          <span className="text-body text-on-surface">Only leads not contacted yet</span>
        </label>
      </div>

      <ModalFooter className="flex items-center justify-end gap-2 px-6 py-4 border-t border-outline-variant/15 max-lg:px-4 max-lg:[&>button]:flex-1">
        <Button variant="ghost" onClick={onClose} disabled={startOutreach.isPending}>
          Cancel
        </Button>
        <Button onClick={handleStart} disabled={!canStart} loading={startOutreach.isPending}>
          <Rocket className="h-4 w-4" />
          Start outreach
        </Button>
      </ModalFooter>
    </>
  );
}
