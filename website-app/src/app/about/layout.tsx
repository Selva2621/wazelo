import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

// page.tsx is a client component, so its metadata lives here.
const seo = {
  path: "/about",
  title: "About Wazelo: The Lead Follow-up Platform",
  description: "Why we built Wazelo, the lead follow-up platform for small businesses that sell on WhatsApp, anywhere in the world. Our mission, our story and our values.",
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
