"use client";

import { Tabs, tabPanelProps } from "@/components/ui/tabs";
import { useTemplates } from "@/hooks/use-templates";
import { useEmailTemplates } from "@/hooks/use-email";

export type TemplateChannel = "whatsapp" | "email";

const ID_BASE = "templates-channel";

/**
 * WhatsApp | Email page tabs under the Templates title. Underlined (not pills), so they
 * read as "which list" and the filters below them as "narrow it down".
 */
export function TemplateChannelTabs({
  value,
  onChange,
}: {
  value: TemplateChannel;
  onChange: (next: TemplateChannel) => void;
}) {
  // Same cached lists the panels use, so the counts cost nothing extra
  const { data: whatsapp } = useTemplates();
  const { data: email } = useEmailTemplates();

  return (
    <div data-tour="templates-tabs">
      <Tabs
        variant="underline"
        idBase={ID_BASE}
        label="Template type"
        tabs={[
          { id: "whatsapp", label: "WhatsApp", count: whatsapp?.length },
          { id: "email", label: "Email", count: email?.length },
        ]}
        activeTab={value}
        onTabChange={(id) => onChange(id === "email" ? "email" : "whatsapp")}
      />
    </div>
  );
}

/** Props for the region the channel tabs switch */
export function channelPanelProps(channel: TemplateChannel) {
  return {
    ...tabPanelProps(ID_BASE, channel),
    className: "space-y-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-focus",
  };
}
