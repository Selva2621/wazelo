"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Plus, Play, Pause, Trash2, BarChart3, Edit2, Sparkles, Zap } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useChatbotFlows,
  useCreateChatbotFlow,
  useActivateChatbotFlow,
  useDeactivateChatbotFlow,
  useDeleteChatbotFlow,
} from "@/hooks/use-chatbot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const TRIGGER_LABELS: Record<string, string> = {
  KEYWORD: "Keyword Match",
  FIRST_MESSAGE: "First Message",
  BUTTON_REPLY: "Button Reply",
};

export default function ChatbotPage() {
  usePageTitle("Chatbot");
  const router = useRouter();
  const { data: flows, isLoading } = useChatbotFlows();
  const createFlow = useCreateChatbotFlow();
  const activateFlow = useActivateChatbotFlow();
  const deactivateFlow = useDeactivateChatbotFlow();
  const deleteFlow = useDeleteChatbotFlow();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    createFlow.mutate(
      {
        name: "New Flow",
        trigger: { type: "KEYWORD", value: "hello" },
      },
      {
        onSuccess: (flow) => router.push(`/chatbot/${flow.id}`),
      },
    );
  };

  const handleCreateAiBot = () => {
    createFlow.mutate(
      {
        name: "AI Support Bot",
        description: "AI-powered chatbot that automatically replies to customers using your product knowledge.",
        trigger: { type: "FIRST_MESSAGE" },
        aiEnabled: true,
        aiSystemPrompt:
          "You are a helpful and professional customer support agent. Answer customer questions accurately and concisely based on the product knowledge provided. If you don't know the answer, politely say so and offer to connect them with a human agent. Keep responses under 150 words.",
        useKnowledgeBase: true,
      },
      {
        onSuccess: (flow) => router.push(`/chatbot/${flow.id}`),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  if (!flows || flows.length === 0) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <div className="text-center max-w-md space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <h2 className="text-[18px] font-semibold text-on-surface">Create Your First Chatbot</h2>
            <p className="text-[13px] text-on-surface-variant mt-2">
              Set up an AI-powered chatbot that automatically replies to customers, or build a custom flow with steps.
            </p>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <Button onClick={handleCreateAiBot} disabled={createFlow.isPending} className="w-full max-w-[280px]">
              <Sparkles className="h-4 w-4 mr-2" />
              Create AI Chatbot (Recommended)
            </Button>
            <Button variant="secondary" onClick={handleCreate} disabled={createFlow.isPending} className="w-full max-w-[280px]">
              <Zap className="h-4 w-4 mr-2" />
              Create Custom Flow
            </Button>
          </div>
          <div className="text-[11px] text-on-surface-variant/60 space-y-1">
            <p><strong>AI Chatbot:</strong> Replies automatically using AI + your product docs. Ready in 2 min.</p>
            <p><strong>Custom Flow:</strong> Build step-by-step flows with conditions, questions, and actions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="text-[18px] font-semibold text-on-surface">Chatbot Flows</h1>
          <Badge variant="muted">{flows.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleCreate} disabled={createFlow.isPending}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Custom Flow
          </Button>
          <Button size="sm" onClick={handleCreateAiBot} disabled={createFlow.isPending}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            AI Chatbot
          </Button>
        </div>
      </div>

      {/* Flow list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flows.map((flow) => (
            <div
              key={flow.id}
              className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-4 hover:border-primary/20 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-on-surface truncate">{flow.name}</h3>
                  {flow.description && (
                    <p className="text-[12px] text-on-surface-variant mt-0.5 line-clamp-2">{flow.description}</p>
                  )}
                </div>
                {flow.aiEnabled && (
                  <Badge variant="primary" className="shrink-0 ml-1">AI</Badge>
                )}
                <Badge variant={flow.isActive ? "success" : "muted"} className="shrink-0 ml-1">
                  {flow.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Badge variant="default" className="text-[10px]">
                  {TRIGGER_LABELS[flow.trigger.type] || flow.trigger.type}
                </Badge>
                {flow.trigger.value && (
                  <Badge variant="muted" className="text-[10px]">
                    &ldquo;{flow.trigger.value}&rdquo;
                  </Badge>
                )}
                <Badge variant="muted" className="text-[10px]">
                  {flow.nodes.length} nodes
                </Badge>
                {flow._count?.sessions !== undefined && (
                  <Badge variant="muted" className="text-[10px]">
                    <BarChart3 className="h-3 w-3 mr-0.5" />
                    {flow._count.sessions} sessions
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/chatbot/${flow.id}`)}
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                {flow.isActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deactivateFlow.mutate(flow.id)}
                    disabled={deactivateFlow.isPending}
                  >
                    <Pause className="h-3.5 w-3.5 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => activateFlow.mutate(flow.id)}
                    disabled={activateFlow.isPending}
                    className="text-success hover:text-success"
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Activate
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteId(flow.id)}
                  className="text-error hover:text-error ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Flow"
        message="This flow and all its sessions will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteFlow.isPending}
        onConfirm={() => {
          if (deleteId) {
            deleteFlow.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
          }
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
