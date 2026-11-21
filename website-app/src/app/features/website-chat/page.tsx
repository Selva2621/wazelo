import WebsiteChatClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/website-chat",
  title: "Website Chat Widget with AI & Team Inbox",
  description: "Add one chat widget to all your websites. Visitors talk to your AI assistant, hand over to your team, and every chat lands in the same Wazelo inbox.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Website chat", path: seo.path }])]} />
      <WebsiteChatClient />
    </>
  );
}
