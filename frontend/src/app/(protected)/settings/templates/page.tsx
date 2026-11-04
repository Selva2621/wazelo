"use client";

import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { TemplateChannelTabs, type TemplateChannel } from "@/components/templates/channel-tabs";
import { WhatsAppTemplates } from "@/components/templates/whatsapp-templates";
import { EmailTemplates } from "@/components/templates/email-templates";

/** Templates: WhatsApp | Email, the choice kept in the URL (?tab=email) so links can open it */
function TemplatesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const channel: TemplateChannel = searchParams.get("tab") === "email" ? "email" : "whatsapp";

  const setChannel = useCallback(
    (next: TemplateChannel) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "email") params.set("tab", "email");
      else params.delete("tab");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const tabs = <TemplateChannelTabs value={channel} onChange={setChannel} />;

  return channel === "email" ? <EmailTemplates channelTabs={tabs} /> : <WhatsAppTemplates channelTabs={tabs} />;
}

export default function TemplatesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      }
    >
      <TemplatesScreen />
    </Suspense>
  );
}
