import LeadFinderClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/lead-finder",
  title: "Lead Finder for Google Maps & IndiaMART",
  description: "Search Google Maps and IndiaMART for businesses by category and city, review the results and add them to Wazelo as leads ready for follow-up.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Lead finder", path: seo.path }])]} />
      <LeadFinderClient />
    </>
  );
}
