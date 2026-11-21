import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

// page.tsx is a client component, so its metadata lives here.
const seo = {
  path: "/privacy",
  title: "Privacy Policy",
  description: "How Wazelo collects, uses and protects personal data, including WhatsApp conversations and contact details, and how to request access or deletion.",
};

export const metadata = pageMetadata(seo);

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Privacy policy", path: seo.path }])]} />
      {children}
    </>
  );
}
