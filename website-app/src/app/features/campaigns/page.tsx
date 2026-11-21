import CampaignsClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/campaigns",
  title: "WhatsApp Bulk Messaging & Broadcast Campaigns",
  description: "Send personalised WhatsApp broadcasts on official Cloud API numbers. Segment contacts, schedule sends and track delivery, reads and replies live.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Campaigns", path: seo.path }])]} />
      <CampaignsClient />
    </>
  );
}
