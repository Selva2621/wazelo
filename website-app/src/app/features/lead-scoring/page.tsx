import LeadScoringClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/lead-scoring",
  title: "Lead Scoring for WhatsApp & Ad Leads",
  description: "Score and rank leads automatically by engagement, profile and behaviour, so your team spends its time on the leads that are most likely to buy.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Lead scoring", path: seo.path }])]} />
      <LeadScoringClient />
    </>
  );
}
