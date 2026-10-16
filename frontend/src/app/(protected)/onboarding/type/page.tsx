"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, User, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrgSettings, useUpdateOrgSettings } from "@/hooks/use-settings";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FREELANCER_TYPE_OPTIONS, type FreelancerTypeValue } from "@/lib/constants/outreach";

type Mode = "TEAM" | "FREELANCER";

function ChoiceCard({
  selected,
  onClick,
  title,
  description,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative text-left rounded-2xl border-2 p-5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
        selected
          ? "border-primary bg-primary/5"
          : "border-outline-variant bg-surface-container-low hover:border-outline hover:bg-surface-container",
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-on-primary" />
        </span>
      )}
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">{icon}</div>
      )}
      <h2 className="font-semibold text-on-surface text-title-sm mb-1 pr-6">{title}</h2>
      <p className="text-label text-on-surface-variant leading-relaxed">{description}</p>
    </button>
  );
}

const MODE_CARDS: { mode: Mode; title: string; description: string; icon: React.ReactNode }[] = [
  {
    mode: "TEAM",
    title: "Team / Company",
    description: "Shared inbox, agent assignments, campaigns, team analytics, and RBAC controls.",
    icon: <Users className="w-6 h-6 text-primary" />,
  },
  {
    mode: "FREELANCER",
    title: "Solo / Freelancer",
    description: "Client pipeline, lead finder, follow-up sequences, and a personal WhatsApp inbox.",
    icon: <User className="w-6 h-6 text-primary" />,
  },
];

export default function OrgTypePage() {
  const router = useRouter();
  const { data: orgSettings, isLoading: orgLoading } = useOrgSettings();
  // Types a super admin has closed to new setups are hidden
  const cards = MODE_CARDS.filter((c) => orgSettings?.orgTypeSetup?.[c.mode] ?? true);
  const [step, setStep] = useState<1 | 2>(1);
  const [chosenMode, setMode] = useState<Mode | null>(null);
  // With a single type open, it is preselected
  const mode = chosenMode ?? (cards.length === 1 ? cards[0].mode : null);
  const [freelancerTypes, setFreelancerTypes] = useState<FreelancerTypeValue[]>([]);
  const hasOther = freelancerTypes.includes("OTHER");

  const toggleFreelancerType = (value: FreelancerTypeValue) =>
    setFreelancerTypes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  const [otherService, setOtherService] = useState("");
  const [error, setError] = useState<string | null>(null);
  const updateOrgSettings = useUpdateOrgSettings();

  const save = () => {
    if (!mode) return;
    setError(null);
    updateOrgSettings.mutate(
      mode === "FREELANCER"
        ? {
            orgType: "FREELANCER",
            freelancerTypes,
            freelancerService: hasOther ? otherService.trim() : undefined,
          }
        : { orgType: "TEAM" },
      {
        onSuccess: () => router.push("/onboarding"),
        onError: () => setError("Failed to save your selection. Please try again."),
      },
    );
  };

  const handleContinue = () => {
    if (step === 1 && mode === "FREELANCER") {
      setStep(2);
      return;
    }
    save();
  };

  const canContinue =
    step === 1
      ? !!mode
      : freelancerTypes.length > 0 && (!hasOther || otherService.trim().length >= 2);

  return (
    <div className="min-h-screen bg-surface flex items-start justify-center pt-12 px-4 pb-12">
      <div className={cn("w-full", step === 1 ? "max-w-lg" : "max-w-2xl")}>
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo/logo.png" alt="Wazelo" className="h-8 w-8 object-contain" />
            <span className="text-title font-semibold text-on-surface">
              Waze<span className="text-primary">lo</span>
            </span>
          </div>
          {mode === "FREELANCER" && (
            <p className="mt-6 text-label font-medium text-on-surface-variant">Step {step} of 2</p>
          )}
          <h1 className={cn("text-headline font-semibold text-on-surface mb-2", mode === "FREELANCER" ? "mt-1" : "mt-6")}>
            {step === 1 ? "How will you use Wazelo?" : "What do you do?"}
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            {step === 1
              ? "Choose how you'll work. This sets up your dashboard and menus."
              : "Pick all that apply. We'll set up message templates and outreach written for your work."}
          </p>
        </div>

        {step === 1 && orgLoading ? (
          <div className="flex justify-center py-12 mb-6" role="status">
            <Spinner />
            <span className="sr-only">Loading…</span>
          </div>
        ) : step === 1 && cards.length === 0 ? (
          <p className="mb-6 rounded-2xl border border-outline-variant bg-surface-container-low p-5 text-center text-body-lg text-on-surface-variant">
            New workspace setup is paused right now. Please check back later.
          </p>
        ) : step === 1 ? (
          <div className={cn("grid grid-cols-1 gap-4 mb-6", cards.length > 1 && "sm:grid-cols-2")}>
            {cards.map((card) => (
              <ChoiceCard
                key={card.mode}
                selected={mode === card.mode}
                onClick={() => setMode(card.mode)}
                icon={card.icon}
                title={card.title}
                description={card.description}
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FREELANCER_TYPE_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.value}
                  selected={freelancerTypes.includes(option.value)}
                  onClick={() => toggleFreelancerType(option.value)}
                  title={option.label}
                  description={option.description}
                />
              ))}
            </div>
            {hasOther && (
              <div>
                <label htmlFor="other-service" className="text-label font-medium text-on-surface-variant">
                  Your service
                </label>
                <Input
                  id="other-service"
                  value={otherService}
                  onChange={(e) => setOtherService(e.target.value)}
                  placeholder="e.g. interior design, tuition, accounting"
                  maxLength={120}
                  className="mt-1"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}

        {error && <p className="text-body-lg text-error text-center mb-4">{error}</p>}

        <div className="flex gap-3">
          {step === 2 && (
            <Button size="lg" variant="secondary" type="button" onClick={() => setStep(1)} disabled={updateOrgSettings.isPending}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          <Button
            size="lg"
            type="button"
            disabled={!canContinue || updateOrgSettings.isPending}
            onClick={handleContinue}
            className="flex-1"
          >
            {updateOrgSettings.isPending ? (
              <>
                <Spinner className="w-4 h-4" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
