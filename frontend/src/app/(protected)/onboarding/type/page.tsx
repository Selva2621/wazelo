"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, User, ArrowRight, Check } from "lucide-react";
import { useUpdateOrgSettings } from "@/hooks/use-settings";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

export default function OrgTypePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<"TEAM" | "FREELANCER" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const updateOrgSettings = useUpdateOrgSettings();

  const handleContinue = () => {
    if (!selected) return;
    setError(null);
    updateOrgSettings.mutate(
      { orgType: selected },
      {
        onSuccess: () => {
          router.push("/onboarding");
        },
        onError: () => {
          setError("Failed to save your selection. Please try again.");
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-surface flex items-start justify-center pt-12 px-4 pb-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img
              src="/logo/logo.png"
              alt="Wazelo"
              className="h-8 w-8 object-contain"
            />
            <span className="text-title font-semibold text-on-surface">
              Waze<span className="text-primary">lo</span>
            </span>
          </div>
          <h1 className="text-headline font-semibold text-on-surface mt-6 mb-2">
            How will you use Wazelo?
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            Choose your mode. You can change this later in Settings.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setSelected("TEAM")}
            className={`relative text-left rounded-2xl border-2 p-6 transition-all focus:outline-none ${
              selected === "TEAM"
                ? "border-primary bg-primary/5"
                : "border-outline-variant bg-surface-container-low hover:border-outline hover:bg-surface-container"
            }`}
          >
            {selected === "TEAM" && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-on-primary" />
              </span>
            )}
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-semibold text-on-surface text-title-sm mb-1">
              Team / Company
            </h2>
            <p className="text-label text-on-surface-variant leading-relaxed">
              Shared inbox, agent assignments, campaigns, team analytics, and
              RBAC controls.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelected("FREELANCER")}
            className={`relative text-left rounded-2xl border-2 p-6 transition-all focus:outline-none ${
              selected === "FREELANCER"
                ? "border-primary bg-primary/5"
                : "border-outline-variant bg-surface-container-low hover:border-outline hover:bg-surface-container"
            }`}
          >
            {selected === "FREELANCER" && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-on-primary" />
              </span>
            )}
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-semibold text-on-surface text-title-sm mb-1">
              Solo / Freelancer
            </h2>
            <p className="text-label text-on-surface-variant leading-relaxed">
              Client pipeline, proposal tracking, follow-up sequences, and a
              personal WhatsApp inbox.
            </p>
          </button>
        </div>

        {error && (
          <p className="text-body-lg text-error text-center mb-4">{error}</p>
        )}

        <Button size="lg"
          type="button"
          disabled={!selected || updateOrgSettings.isPending}
          onClick={handleContinue}
          className="w-full"
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
  );
}
