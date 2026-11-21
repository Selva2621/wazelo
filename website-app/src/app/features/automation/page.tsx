import AutomationClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/automation",
  title: "WhatsApp Automation: No-Code Workflows",
  description: "Build no-code WhatsApp automations: auto-replies, lead routing, drip follow-ups and webhook triggers that run around the clock without your team.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Automation", path: seo.path }])]} />
      <AutomationClient />
    </>
  );
}
