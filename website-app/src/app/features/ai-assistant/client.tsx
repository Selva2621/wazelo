"use client";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

const data: FeatureDetailData = {
  slug: "ai-assistant",
  tag: "AI assistant",
  heroTitle: "One assistant.<br /><span style=\"color:#ffb77d\">Your answers.</span>",
  heroSubtitle: "Teach it your website, files and instructions once. It answers on WhatsApp and your website chat.",
  heroScreen: "/media/features/ai-assistant.jpg",
  overviewTitle: "It answers from what you give it.",
  overviewDesc: "The assistant only uses your knowledge. When it doesn't know, it says a person will reply and saves the question for you.",
  capabilities: [
    { icon: "language", title: "Learns your website", desc: "Add your website and it reads the pages." },
    { icon: "upload_file", title: "Files and FAQs", desc: "Upload files and add FAQs, or let AI suggest them." },
    { icon: "edit_note", title: "Instructions", desc: "Tell it how to talk and what isn't on your website." },
    { icon: "help", title: "Unanswered questions", desc: "Questions it couldn't answer are listed so you can fill the gap." },
    { icon: "support_agent", title: "Hands over", desc: "It passes the chat to a person, with working hours you set." },
    { icon: "monitoring", title: "Bot insights", desc: "See how much it answered, what it handed over and suspicious messages." },
    { icon: "toll", title: "AI credits", desc: "Each AI action uses credits, and you see the cost before you run it." },
    { icon: "chat", title: "Test it first", desc: "Ask it questions in a test chat before it goes live." },
  ],
  howItWorks: [
    { step: "01", title: "Add your knowledge", desc: "Your website, files, FAQs and instructions." },
    { step: "02", title: "Test it", desc: "Ask what your customers ask and check the sources." },
    { step: "03", title: "Choose where it replies", desc: "WhatsApp, your website chat or both." },
    { step: "04", title: "Fill the gaps", desc: "Answer the questions it couldn't." },
  ],
  relatedFeatures: [
    { label: "Website chat", href: "/features/website-chat", icon: "chat_bubble" },
    { label: "Chatbot builder", href: "/features/chatbot", icon: "smart_toy" },
    { label: "Shared inbox", href: "/features/shared-inbox", icon: "forum" },
    { label: "Proposals", href: "/features/proposals", icon: "request_quote" },
  ],
};

export default function AiAssistantClient() {
  return <FeatureDetailPage data={data} />;
}
