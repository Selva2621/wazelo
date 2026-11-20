import { JsonLd } from "@/components/json-ld";
import { IconFont } from "@/components/icon-font";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

// page.tsx is a client component, so its metadata lives here.
const seo = {
  path: "/api-reference",
  title: "Wazelo REST API Reference",
  description: "Reference for the Wazelo REST API. Authenticate with API keys and work with contacts, messages, campaigns, conversations and deals from your own apps.",
};

export const metadata = pageMetadata(seo);

export default function ApiReferenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IconFont />
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "API reference", path: seo.path }])]} />
      {children}
    </>
  );
}
