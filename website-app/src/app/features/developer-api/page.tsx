import DeveloperApiClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/developer-api",
  title: "WhatsApp CRM API, Webhooks & MCP Server",
  description: "Connect Wazelo to your stack with a REST API, webhooks and an MCP server. Search contacts, add notes and tags, read chats, move deals and plug in AI.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Developer API", path: seo.path }])]} />
      <DeveloperApiClient />
    </>
  );
}
