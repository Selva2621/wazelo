import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

// page.tsx is a client component, so its metadata lives here.
const seo = {
  path: "/terms",
  title: "Terms of Service",
  description: "The terms that govern your use of Wazelo, the lead follow-up platform, including accounts, billing, acceptable use and WhatsApp messaging policies.",
};

export const metadata = pageMetadata(seo);

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Terms of service", path: seo.path }])]} />
      {children}
    </>
  );
}
