"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Rocket, Clock, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { useStartOutreach } from "@/hooks/use-sequences";
import { useSendHealth } from "@/hooks/use-whatsapp";
import { getOutreachSteps, hasOutreachBlanks } from "@/lib/constants/outreach";
import { useOrgSettings } from "@/hooks/use-settings";

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
  // Written for their line of work (chosen in onboarding)
  const { data: orgSettings } = useOrgSettings();
  const [steps, setSteps] = useState<{ name: string; delayMinutes: number; messageBody: string }[]>(() =>
    getOutreachSteps(orgSettings?.freelancerType, orgSettings?.freelancerService),
  );
  const [onlyNew, setOnlyNew] = useState(true);

  const blanks = steps.some((s) => hasOutreachBlanks(s.messageBody));
  const canStart = name.trim() && steps.every((s) => s.messageBody.trim()) && !blanks;

  // New-contact cap per day for this number → rough number of days to reach everyone
  const perDay = health?.warmup.coldCap;
  const days = perDay ? Math.ceil(run.importedCount / perDay) : null;

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
        onError: (err: Error & { response?: { data?: { message?: string } } }) =>
          toast.error(err.response?.data?.message || "Could not start outreach"),
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
        <div className="flex gap-2 rounded-xl bg-surface-container px-3 py-2.5 text-label text-on-surface-variant">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Messages go to the <strong className="text-on-surface">{run.importedCount} imported lead{run.importedCount !== 1 ? "s" : ""}</strong> from
            this run, from your WhatsApp number, between 9:00 and 20:00.
            {perDay && (
              <>
                {" "}Your number can message <strong className="text-on-surface">{perDay} new contacts a day</strong>
                {days && days > 1 ? ` — about ${days} days to reach everyone.` : "."}
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

      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-outline-variant/15">
        <Button variant="ghost" onClick={onClose} disabled={startOutreach.isPending}>
          Cancel
        </Button>
        <Button onClick={handleStart} disabled={!canStart} loading={startOutreach.isPending}>
          <Rocket className="h-4 w-4" />
          Start outreach
        </Button>
      </div>
    </>
  );
}
