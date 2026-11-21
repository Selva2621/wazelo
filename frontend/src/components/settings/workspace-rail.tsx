"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { RailCard, RailRow } from "@/components/layout/form-with-rail";
import { useOrgSettings } from "@/hooks/use-settings";
import { getCountry } from "@/lib/constants/countries";

const SETUP_LINKS = [
  { href: "/settings/whatsapp", label: "WhatsApp" },
  { href: "/settings/chat-widget", label: "Chat widget" },
  { href: "/settings/email", label: "Email" },
  { href: "/settings/billing", label: "Billing" },
];

function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Side panel for the settings form tabs: the workspace at a glance and where to set up the rest. */
export function WorkspaceRail() {
  const { data: org } = useOrgSettings();

  return (
    <>
      {org && (
        <RailCard title="Workspace">
          <RailRow label="Name">{org.name || "—"}</RailRow>
          <RailRow label="Country">{getCountry(org.country).name}</RailRow>
          <RailRow label="Currency">{org.currency}</RailRow>
          <RailRow label="Timezone">{org.timezone}</RailRow>
          <RailRow label="Language">{languageName(org.language)}</RailRow>
        </RailCard>
      )}
      <RailCard title="Setup">
        <ul className="-mx-2">
          {SETUP_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex h-9 items-center justify-between rounded-lg px-2 text-label font-medium text-on-surface transition-colors duration-120 ease-standard hover:bg-surface-container-low outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {link.label}
                <ChevronRight className="h-4 w-4 text-on-surface-variant" />
              </Link>
            </li>
          ))}
        </ul>
      </RailCard>
    </>
  );
}
