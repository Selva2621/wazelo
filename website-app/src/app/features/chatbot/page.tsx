import ChatbotClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/chatbot",
  title: "WhatsApp Chatbot Builder, No Code Needed",
  description: "Build WhatsApp chatbots without code. Qualify leads, answer common questions, capture details and hand the chat to your team at the right moment.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Chatbot builder", path: seo.path }])]} />
      <ChatbotClient />
    </>
  );
}
