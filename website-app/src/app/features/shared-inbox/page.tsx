import SharedInboxClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/shared-inbox",
  title: "Shared WhatsApp Inbox for Sales & Support Teams",
  description: "Give your whole team one WhatsApp number. Assign chats, add notes, track response times and resolve every conversation from one shared inbox.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Shared inbox", path: seo.path }])]} />
      <SharedInboxClient />
    </>
  );
}
