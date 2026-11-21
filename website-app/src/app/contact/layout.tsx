import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

// page.tsx is a client component, so its metadata lives here.
const seo = {
  path: "/contact",
  title: "Contact Wazelo Sales & Support",
  description: "Talk to the Wazelo team about pricing, a demo, support or partnerships. Email hello@wazelo.in or sales@wazelo.in and we reply within 24 hours.",
};

export const metadata = pageMetadata(seo);

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Contact", path: seo.path }])]} />
      {children}
    </>
  );
}
