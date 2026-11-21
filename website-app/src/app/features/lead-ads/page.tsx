import LeadAdsClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/lead-ads",
  title: "Facebook & Instagram Lead Ads to WhatsApp",
  description: "Facebook and Instagram lead ads arrive in Wazelo straight from Meta and get a WhatsApp welcome within seconds. Follow-up then runs until they reply.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Lead ads", path: seo.path }])]} />
      <LeadAdsClient />
    </>
  );
}
