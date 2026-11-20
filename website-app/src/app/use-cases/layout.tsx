import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

// page.tsx is a client component, so its metadata lives here.
const seo = {
  path: "/use-cases",
  title: "Lead Follow-up Use Cases by Industry",
  description: "How real estate, e-commerce, healthcare, education and finance teams use Wazelo to answer leads on WhatsApp in seconds and follow up until they buy.",
};

export const metadata = pageMetadata(seo);

export default function UseCasesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Use cases", path: seo.path }])]} />
      {children}
    </>
  );
}
