"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useActivateChatbotFlow } from "@/hooks/use-chatbot";
import { useAutomationRules } from "@/hooks/use-automation";
import { isGreetingRule } from "@/lib/greeting-overlap";
import type { ChatbotFlow } from "@/lib/types/chatbot";

/**
 * Activates a chatbot flow, but first warns when a first-message flow would run next
 * to an automation that already replies to every message (new contacts get two replies).
 * Render `dialog` once in the page.
 */
export function useActivateChatbotFlowChecked() {
  const activate = useActivateChatbotFlow();
  const { data: activeRules } = useAutomationRules({ status: "ACTIVE", limit: 100 });
  const greetingRule = (activeRules?.data ?? []).find(isGreetingRule);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const request = (flow: Pick<ChatbotFlow, "id" | "trigger">) => {
    if (flow.trigger.type === "FIRST_MESSAGE" && greetingRule) setPendingId(flow.id);
    else activate.mutate(flow.id);
  };

  const dialog = (
    <ConfirmDialog
      open={!!pendingId}
      title="New contacts would get two replies"
      message={`Automation "${greetingRule?.name ?? ""}" already replies to every incoming message. With this chatbot on as well, a new contact's first message gets both. Turn that rule off on the Automation page, or activate anyway.`}
      confirmLabel="Activate anyway"
      variant="warning"
      loading={activate.isPending}
      onCancel={() => setPendingId(null)}
      onConfirm={() => {
        if (pendingId) activate.mutate(pendingId, { onSettled: () => setPendingId(null) });
      }}
    />
  );

  return { request, dialog, isPending: activate.isPending };
}
