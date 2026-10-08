import type { Metadata } from "next";
import ChatbotClient from "./client";

export const metadata: Metadata = {
  title: "WhatsApp Chatbot Builder",
  description: "Build a WhatsApp AI chatbot that answers from your documents, or a custom flow with questions, conditions and API calls. Trigger on keywords or first messages.",
  keywords: [
    "WhatsApp chatbot", "WhatsApp bot builder", "no-code WhatsApp chatbot",
    "WhatsApp FAQ bot", "WhatsApp lead qualification bot",
    "WhatsApp AI chatbot", "WhatsApp chatbot India", "WhatsApp chatbot builder",
    "WhatsApp automated responses", "WhatsApp bot no code",
    "WhatsApp chatbot for business", "WhatsApp chatbot software",
    "WhatsApp quick reply bot", "WhatsApp chatbot free",
    "WhatsApp customer service bot", "build WhatsApp bot",
    "WhatsApp chatbot CRM", "WhatsApp bot integration",
    "WhatsApp chatbot lead generation", "WhatsApp bot India",
  ],
  alternates: { canonical: "https://wazelo.in/features/chatbot" },
  openGraph: {
    title: "WhatsApp Chatbot Builder | Wazelo CRM",
    description: "Build a WhatsApp AI chatbot that answers from your documents, or a custom flow with questions, conditions and API calls. Trigger on keywords or first messages.",
    url: "https://wazelo.in/features/chatbot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Chatbot Builder | Wazelo CRM",
    description: "Build a WhatsApp AI chatbot that answers from your documents, or a custom flow with questions, conditions and API calls. Trigger on keywords or first messages.",
  },
};

export default function Page() {
  return <ChatbotClient />;
}
