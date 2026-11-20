import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

// page.tsx is a client component, so its metadata lives here.
const seo = {
  path: "/about",
  title: "About Wazelo: Lead Follow-up Software Made in India",
  description: "Why we built Wazelo, the lead follow-up platform for Indian businesses that sell on WhatsApp. Our mission, our story and the values behind the product.",
};

export const metadata = pageMetadata(seo);

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "About", path: seo.path }])]} />
      {children}
    </>
  );
}
