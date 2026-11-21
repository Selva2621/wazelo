import DealsClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/deals",
  title: "Sales Pipeline CRM for WhatsApp Leads",
  description: "Track every WhatsApp lead through a visual deals pipeline. Move deals between stages, see the value at each step and forecast revenue in one place.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Deals pipeline", path: seo.path }])]} />
      <DealsClient />
    </>
  );
}
