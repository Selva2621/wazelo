import FeaturesClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { ALL_FEATURES } from "@/components/features/feature-groups";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features",
  title: "Features: WhatsApp CRM for Lead Follow-up",
  description:
    "Every Wazelo feature in one place: Meta lead ads, website chat, a shared WhatsApp inbox, AI replies, follow-up sequences, proposals and a deals pipeline.",
};

export const metadata = pageMetadata(seo);

const itemList = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Wazelo features",
  itemListElement: ALL_FEATURES.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: f.label, url: absoluteUrl(f.href) })),
};

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Features", path: seo.path }]), itemList]} />
      <FeaturesClient />
    </>
  );
}
