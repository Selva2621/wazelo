import AnalyticsClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/analytics",
  title: "WhatsApp Team Analytics & Response-Time Reports",
  description: "See response times, delivery rates, agent performance and CSAT scores across every WhatsApp conversation, in reports your whole team can read.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Analytics", path: seo.path }])]} />
      <AnalyticsClient />
    </>
  );
}
