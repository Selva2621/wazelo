import ContactsClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/contacts",
  title: "WhatsApp Contact Management & Segmentation",
  description: "Keep every WhatsApp contact in one place. Tag, segment and import from CSV, with the full conversation history on each contact. No spreadsheets.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Contacts", path: seo.path }])]} />
      <ContactsClient />
    </>
  );
}
