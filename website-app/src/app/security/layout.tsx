import { JsonLd } from "@/components/json-ld";
import { IconFont } from "@/components/icon-font";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

// page.tsx is a client component, so its metadata lives here.
const seo = {
  path: "/security",
  title: "Security & Data Protection",
  description: "How Wazelo protects your data: encryption in transit and at rest, isolated workspaces, role-based access, audit logs and the official WhatsApp Cloud API.",
};

export const metadata = pageMetadata(seo);

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IconFont />
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Security", path: seo.path }])]} />
      {children}
    </>
  );
}
