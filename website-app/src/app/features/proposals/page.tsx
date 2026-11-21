import ProposalsClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/proposals",
  title: "Send Proposals on WhatsApp & Track Views",
  description: "Draft a proposal from the chat with AI, send it as a link on WhatsApp and see the moment the client views it, accepts it or asks for changes.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Proposals", path: seo.path }])]} />
      <ProposalsClient />
    </>
  );
}
