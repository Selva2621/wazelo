import SequencesClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/sequences",
  title: "WhatsApp Follow-up Sequences & Drip Messages",
  description: "Multi-step WhatsApp follow-up sequences that space messages by days and stop the moment a lead replies. Set it once and never chase a lead by hand.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Follow-up sequences", path: seo.path }])]} />
      <SequencesClient />
    </>
  );
}
