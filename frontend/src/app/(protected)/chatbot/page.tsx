"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, Plus, Play, Pause, Trash2, BarChart3, Edit2, Sparkles, Zap,
  ClipboardList, Images, Clock, BookOpen,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useOrgSettings } from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-billing";
import { RecipeCards } from "@/components/ui/recipe-cards";
import { useActivateChatbotFlowChecked } from "@/hooks/use-activate-chatbot-flow-checked";
import { useAuthStore } from "@/stores/auth-store";
import { DEFAULT_PRESET_PROFILE } from "@/lib/constants/preset-profile";
import {
  buildPresetNodes,
  getChatbotPresets,
  type ChatbotPresetIcon,
} from "@/lib/constants/chatbot-presets";
import {
  useChatbotFlows,
  useSaveChatbotNodes,
  useCreateChatbotFlow,
  useDeactivateChatbotFlow,
  useDeleteChatbotFlow,
} from "@/hooks/use-chatbot";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BotHealthStrip } from "@/components/chatbot/bot-health-strip";

const PRESET_ICONS: Record<ChatbotPresetIcon, typeof Bot> = {
  qualify: ClipboardList,
  portfolio: Images,
  hours: Clock,
  ai: Sparkles,
};

const TRIGGER_LABELS: Record<string, string> = {
  KEYWORD: "Keyword match",
  FIRST_MESSAGE: "First message",
  BUTTON_REPLY: "Button reply",
};

export default function ChatbotPage() {
  usePageTitle("Chatbot");
  const router = useRouter();
  const { data: flows, isLoading } = useChatbotFlows();
  const createFlow = useCreateChatbotFlow();
  // Warns before a first-message flow doubles up with an automation welcome
  const activateChecked = useActivateChatbotFlowChecked();
  const deactivateFlow = useDeactivateChatbotFlow();
  const deleteFlow = useDeleteChatbotFlow();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Recipes written for the org's kind of work; AI ones only when the plan has AI
  const { data: orgSettings } = useOrgSettings();
  const { data: subData } = useSubscription();
  const aiEnabled = subData?.subscription?.plan?.aiEnabled ?? true;
  const firstName = useAuthStore((s) => s.user?.firstName);
  const presets = getChatbotPresets(orgSettings?.orgType, aiEnabled, {
    ...DEFAULT_PRESET_PROFILE,
    introDetails: { name: firstName, freelancerTypes: orgSettings?.freelancerTypes, service: orgSettings?.freelancerServiceLabel ?? orgSettings?.freelancerService },
  });
  const saveNodes = useSaveChatbotNodes();
  const creatingPreset = createFlow.isPending || saveNodes.isPending;

  const handlePreset = (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    createFlow.mutate(preset.flow, {
      onSuccess: (flow) => {
        if (!preset.steps?.length) {
          router.push(`/chatbot/${flow.id}`);
          return;
        }
        // Steps link to each other by id, so they are saved once the flow exists
        saveNodes.mutate(
          { flowId: flow.id, nodes: buildPresetNodes(preset.steps) },
          { onSettled: () => router.push(`/chatbot/${flow.id}`) },
        );
      },
    });
  };

  const recipeItems = presets.map((p) => {
    const Icon = PRESET_ICONS[p.icon];
    return { id: p.id, icon: <Icon className="h-4 w-4" />, title: p.title, summary: p.summary, needs: p.needs };
  });

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
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center px-6">
        <div className="w-full max-w-4xl space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-title font-semibold text-on-surface">Create your first chatbot</h2>
            <p className="text-body text-on-surface-variant mt-2">
              Pick a ready-made flow and edit it, or start from a blank one. New flows stay off until you activate them.
            </p>
          </div>
          <RecipeCards items={recipeItems} onPick={handlePreset} disabled={creatingPreset} />
          <div className="flex justify-center">
            <Button variant="secondary" onClick={handleCreate} disabled={creatingPreset}>
              <Zap className="h-4 w-4 mr-2" />
              Blank custom flow
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Mobile: header buttons move to the nav bar */}
      <MobilePageActions
        primary={
          aiEnabled
            ? { label: "AI chatbot", onClick: () => !createFlow.isPending && handleCreateAiBot() }
            : { label: "Custom flow", onClick: () => !createFlow.isPending && handleCreate() }
        }
        more={[
          aiEnabled && { label: "Custom flow", onSelect: handleCreate, disabled: createFlow.isPending },
          aiEnabled && { label: "Bot knowledge", onSelect: () => router.push("/chatbot/knowledge") },
        ]}
      />
      {/* Header */}
      <PageHeader
        className="shrink-0 px-6 pt-5 pb-4 max-lg:hidden"
        title="Chatbot flows"
        count={flows.length}
        actions={
          <>
            {aiEnabled && (
              <Button variant="secondary" onClick={() => router.push("/chatbot/knowledge")}>
                <BookOpen className="mr-1 h-4 w-4" />
                Bot knowledge
              </Button>
            )}
            <Button
              variant={aiEnabled ? "secondary" : "primary"}
              onClick={handleCreate}
              disabled={createFlow.isPending}
            >
              <Plus className="mr-1 h-4 w-4" />
              Custom flow
            </Button>
            {aiEnabled && (
              <Button onClick={handleCreateAiBot} disabled={createFlow.isPending}>
                <Sparkles className="mr-1 h-4 w-4" />
                AI chatbot
              </Button>
            )}
          </>
        }
      />

      {/* Flow list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {aiEnabled && (
          <div data-tour="bot-health">
            <BotHealthStrip className="mb-5" />
          </div>
        )}
        <RecipeCards className="mb-5" items={recipeItems} onPick={handlePreset} disabled={creatingPreset} />
        <div data-tour="bot-flows" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flows.map((flow) => (
            <div
              key={flow.id}
              className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4 transition-colors hover:border-outline"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="text-body-lg font-semibold text-on-surface truncate">{flow.name}</h3>
                  {flow.description && (
                    <p className="text-label text-on-surface-variant mt-0.5 line-clamp-2">{flow.description}</p>
                  )}
                </div>
                {flow.aiEnabled && (
                  <Badge variant="primary" className="shrink-0 ml-1">AI</Badge>
                )}
                <Badge variant={flow.isActive ? "success" : "muted"} dot className="shrink-0 ml-1">
                  {flow.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-3 max-lg:flex-wrap">
                <Badge variant="default" className="text-caption">
                  {TRIGGER_LABELS[flow.trigger.type] || flow.trigger.type}
                </Badge>
                {flow.trigger.value && (
                  <Badge variant="muted" className="text-caption">
                    &ldquo;{flow.trigger.value}&rdquo;
                  </Badge>
                )}
                <Badge variant="muted" className="text-caption">
                  {flow.nodes.length} nodes
                </Badge>
                {flow._count?.sessions !== undefined && (
                  <Badge variant="muted" className="text-caption">
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
                    onClick={() => activateChecked.request(flow)}
                    disabled={activateChecked.isPending}
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
                  title="Delete flow"
                  aria-label={`Delete ${flow.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activateChecked.dialog}
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
