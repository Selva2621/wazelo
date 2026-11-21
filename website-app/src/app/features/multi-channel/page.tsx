import MultiChannelClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/multi-channel",
  title: "Omnichannel Inbox for WhatsApp, Instagram & Email",
  description: "Answer WhatsApp, Instagram DMs, Facebook Messenger and email from one inbox, with the same assignments, automations and reports on every channel.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Multi-channel inbox", path: seo.path }])]} />
      <MultiChannelClient />
    </>
  );
}
