"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Users, User, ArrowRight, ArrowLeft, Check, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFreelancerProfiles, useOrgSettings, useUpdateOrgSettings } from "@/hooks/use-settings";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { freelancerTypeOptions, visibleFreelancerOptions } from "@/lib/constants/outreach";
import { DEFAULT_COUNTRY_CODE, browserTimezone, detectCountryCode, getCountry } from "@/lib/constants/countries";
import { CountrySelect } from "@/components/ui/country-select";

type Mode = "TEAM" | "FREELANCER";

/** The browser's country never changes while the page is open */
const noopSubscribe = () => () => {};

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
        "relative text-left rounded-2xl border-2 p-5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-focus max-lg:min-h-14 max-lg:p-4 max-lg:active:scale-[0.99]",
        // Phones: icon on the left, text beside it
        !!icon && "max-sm:grid max-sm:grid-cols-[48px_1fr] max-sm:items-center max-sm:gap-x-4",
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
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 max-sm:row-span-2 max-sm:mb-0">{icon}</div>
      )}
      <h2 className="font-semibold text-on-surface text-title-sm mb-1 pr-6 max-sm:self-end">{title}</h2>
      <p className="text-label text-on-surface-variant leading-relaxed max-sm:col-start-2 max-sm:self-start">{description}</p>
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
  const [freelancerTypes, setFreelancerTypes] = useState<string[]>([]);
  const hasOther = freelancerTypes.includes("OTHER");
  // Every line of work (built in + super admin); popular ones first, search for the rest
  const { data: catalog } = useFreelancerProfiles(step === 2);
  const typeOptions = freelancerTypeOptions(catalog);
  const [typeQuery, setTypeQuery] = useState("");
  const [showAllTypes, setShowAllTypes] = useState(false);
  const visibleTypes = visibleFreelancerOptions(typeOptions, {
    query: typeQuery,
    selected: freelancerTypes,
    showAll: showAllTypes,
  });
  const hiddenCount = typeOptions.length - visibleTypes.length;

  const toggleFreelancerType = (value: string) =>
    setFreelancerTypes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  const [otherService, setOtherService] = useState("");
  // Guessed from the browser (the server renders the default); sets the phone code, currency and timezone
  const detectedCountry = useSyncExternalStore(noopSubscribe, detectCountryCode, () => DEFAULT_COUNTRY_CODE);
  const [chosenCountry, setCountry] = useState<string | null>(null);
  const country = chosenCountry ?? detectedCountry;
  const [error, setError] = useState<string | null>(null);
  const updateOrgSettings = useUpdateOrgSettings();

  const save = () => {
    if (!mode) return;
    setError(null);
    const picked = getCountry(country);
    const locale = {
      country: picked.code,
      currency: picked.currency,
      // The browser's own zone is more precise (US, Australia) when it's the same country
      timezone: (picked.code === detectedCountry && browserTimezone()) || picked.timezone,
    };
    updateOrgSettings.mutate(
      mode === "FREELANCER"
        ? {
            ...locale,
            orgType: "FREELANCER",
            freelancerTypes,
            freelancerService: hasOther ? otherService.trim() : undefined,
          }
        : { ...locale, orgType: "TEAM" },
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
    <div className="min-h-screen bg-surface flex items-start justify-center pt-12 px-4 pb-12 max-lg:min-h-dvh max-lg:pt-[calc(24px+var(--safe-top))] max-lg:pb-0 max-lg:pl-[max(16px,var(--safe-left))] max-lg:pr-[max(16px,var(--safe-right))]">
      <div className={cn("w-full", step === 1 ? "max-w-lg" : "max-w-2xl")}>
        {/* Logo */}
        <div className="text-center mb-10 max-lg:mb-6">
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
          <>
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
            <div className="mb-6 space-y-1.5">
              <label htmlFor="org-country" className="text-label font-medium text-on-surface-variant">
                Country
              </label>
              <CountrySelect id="org-country" value={country} onChange={setCountry} showDialCode />
              <p className="text-caption text-on-surface-variant">
                Sets your phone code, currency ({getCountry(country).currency}) and timezone. You can change it later in Settings.
              </p>
            </div>
          </>
        ) : (
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <Input
                aria-label="Search your line of work"
                value={typeQuery}
                onChange={(e) => setTypeQuery(e.target.value)}
                placeholder="Search, e.g. civil, tutor, makeup"
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleTypes.map((option) => (
                <ChoiceCard
                  key={option.value}
                  selected={freelancerTypes.includes(option.value)}
                  onClick={() => toggleFreelancerType(option.value)}
                  title={option.label}
                  description={option.description}
                />
              ))}
            </div>
            {typeQuery.trim() && visibleTypes.every((o) => o.value === "OTHER" || freelancerTypes.includes(o.value)) && (
              <p className="text-label text-on-surface-variant text-center">
                No match. Pick &ldquo;Something else&rdquo; and type your service.
              </p>
            )}
            {!typeQuery.trim() && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllTypes(true)}
                className="mx-auto flex items-center gap-1 text-body text-primary hover:underline max-lg:min-h-11"
              >
                Show all {typeOptions.length - 1} types
                <ChevronDown className="h-4 w-4" />
              </button>
            )}
            {hasOther && (
              <div>
                <label htmlFor="other-service" className="text-label font-medium text-on-surface-variant">
                  Your service
                </label>
                <Input
                  id="other-service"
                  value={otherService}
                  onChange={(e) => setOtherService(e.target.value)}
                  placeholder="e.g. cake baking, pet grooming"
                  maxLength={120}
                  className="mt-1"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}

        {error && <p className="text-body-lg text-error text-center mb-4">{error}</p>}

        {/* Phones/tablets: the buttons stay pinned above the home indicator */}
        <div className="flex gap-3 max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:-mx-4 max-lg:bg-surface/90 max-lg:px-4 max-lg:pt-3 max-lg:pb-[calc(12px+var(--safe-bottom))] max-lg:backdrop-blur-md max-lg:[&>button]:h-12">
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
