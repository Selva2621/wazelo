import CsatClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/csat",
  title: "WhatsApp CSAT Surveys After Every Chat",
  description: "Send a satisfaction survey on WhatsApp after every resolved chat. Ratings are collected automatically and you can track the score for each agent.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "CSAT surveys", path: seo.path }])]} />
      <CsatClient />
    </>
  );
}
