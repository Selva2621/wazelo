import { redirect } from "next/navigation";

/** Bot knowledge became the AI assistant page (WhatsApp and website share it). */
export default function ChatbotKnowledgeRedirect() {
  redirect("/ai-assistant");
}
