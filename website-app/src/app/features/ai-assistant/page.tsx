import AiAssistantClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/ai-assistant",
  title: "AI Assistant for WhatsApp & Website Chat",
  description: "An AI assistant that answers leads on WhatsApp and your website from your own pages, files and instructions, and hands over to your team when it should.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "AI assistant", path: seo.path }])]} />
      <AiAssistantClient />
    </>
  );
}
