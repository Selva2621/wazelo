"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Zap, MessageCircle, Tag, Clock, FileText, Trophy, Globe } from "lucide-react";
import { useOrgSettings } from "@/hooks/use-settings";
import { RecipeCards } from "@/components/ui/recipe-cards";
import { useChatbotFlows } from "@/hooks/use-chatbot";
import { useAuthStore } from "@/stores/auth-store";
import { DEFAULT_PRESET_PROFILE } from "@/lib/constants/preset-profile";
import { isGreetingFlow } from "@/lib/greeting-overlap";
import {
  getAutomationPresets,
  type AutomationPreset,
  type AutomationPresetIcon,
} from "@/lib/constants/automation-presets";

const PRESET_ICONS: Record<AutomationPresetIcon, typeof Zap> = {
  welcome: MessageCircle,
  pricing: Tag,
  "follow-up": Clock,
  proposal: FileText,
  won: Trophy,
  website: Globe,
};
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useAutomationRules,
  useExecutionLogs,
  useEnableAutomationRule,
  useDisableAutomationRule,
  useDeleteAutomationRule,
} from "@/hooks/use-automation";
import { useAutomationSocket } from "@/hooks/use-automation-socket";
import { useAutomationStore } from "@/stores/automation-store";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { AutomationRulesTable } from "@/components/automation/automation-rules-table";
import { ExecutionLogsTable } from "@/components/automation/execution-logs-table";
import { CreateAutomationRuleModal } from "@/components/automation/create-automation-rule-modal";
import { useSubscription } from "@/hooks/use-billing";
import type {
  AutomationRuleStatus,
  ListAutomationRulesParams,
  ListExecutionLogsParams,
} from "@/lib/types/automation";

const TAKE = 20;

const MAIN_TABS = [
  { id: "rules", label: "Rules" },
  { id: "logs", label: "Execution Logs" },
];

const RULE_STATUS_TABS = [
  { id: "ALL", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "INACTIVE", label: "Inactive" },
];

export default function AutomationPage() {
  usePageTitle("Automation");
  useAutomationSocket();
  const { data: subData } = useSubscription();
  const automationEnabled = subData?.subscription?.plan?.automationEnabled ?? true;

  const {
    activeTab,
    filterStatus,
    rulesPage,
    logsPage,
    filterLogStatus,
    filterLogRuleId,
    showCreateModal,
    setActiveTab,
    setFilterStatus,
    setRulesPage,
    setLogsPage,
    setShowCreateModal,
  } = useAutomationStore();

  // Recipes written for the org's kind of work (freelancer vs team)
  const { data: orgSettings } = useOrgSettings();
  const firstName = useAuthStore((s) => s.user?.firstName);
  const presets = getAutomationPresets(orgSettings?.orgType, {
    ...DEFAULT_PRESET_PROFILE,
    introDetails: { name: firstName, freelancerTypes: orgSettings?.freelancerTypes, service: orgSettings?.freelancerService },
  });
  const [preset, setPreset] = useState<AutomationPreset | null>(null);
  // An active chatbot already answers first messages — a welcome rule would be a second reply
  const { data: chatbotFlows } = useChatbotFlows();
  const greetingBot = chatbotFlows?.find(isGreetingFlow);

  const enableRule = useEnableAutomationRule();
  const disableRule = useDisableAutomationRule();
  const deleteRule = useDeleteAutomationRule();

  // Rules query
  const effectiveRuleStatus: AutomationRuleStatus | undefined =
    filterStatus !== null ? filterStatus : undefined;

  const rulesParams = useMemo<ListAutomationRulesParams>(
    () => ({
      limit: TAKE,
      offset: rulesPage * TAKE,
      status: effectiveRuleStatus,
    }),
    [rulesPage, effectiveRuleStatus],
  );

  const { data: rulesData, isLoading: rulesLoading } =
    useAutomationRules(rulesParams);

  // Logs query
  const logsParams = useMemo<ListExecutionLogsParams>(
    () => ({
      limit: TAKE,
      offset: logsPage * TAKE,
      status: filterLogStatus ?? undefined,
      ruleId: filterLogRuleId ?? undefined,
    }),
    [logsPage, filterLogStatus, filterLogRuleId],
  );

  const { data: logsData, isLoading: logsLoading } =
    useExecutionLogs(logsParams);

  // Status tab for rules
  const ruleStatusTabId = filterStatus ?? "ALL";

  function handleRuleStatusTabChange(tabId: string) {
    setFilterStatus(
      tabId === "ALL" ? null : (tabId as AutomationRuleStatus),
    );
  }

  const ruleStatusTabsWithCounts = RULE_STATUS_TABS.map((tab) => ({
    ...tab,
    count: tab.id === "ALL" ? rulesData?.total : undefined,
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Upgrade banner */}
      {!automationEnabled && (
        <div className="shrink-0 mx-6 mt-4 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-container px-4 py-3 text-body text-warning">
          <Zap className="h-4 w-4 shrink-0 text-warning" />
          <span>
            <strong>Automation</strong> is not included in your current plan.{" "}
            <Link href="/settings/billing" className="underline font-medium hover:text-on-surface">
              Upgrade to Growth or higher
            </Link>{" "}
            to unlock this feature.
          </span>
        </div>
      )}
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-0 space-y-4">
        {/* Mobile: the nav bar shows the title and the "+" */}
        {activeTab === "rules" && (
          <MobilePageActions primary={{ label: "New Rule", onClick: () => setShowCreateModal(true) }} />
        )}
        <div className="flex items-center justify-between max-lg:hidden">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-on-surface-variant" />
            <h1 className="text-title font-semibold text-on-surface">
              Automation
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "rules" && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Rule
              </Button>
            )}
          </div>
        </div>

        {/* Main tabs: Rules | Logs */}
        <Tabs
          tabs={MAIN_TABS}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as "rules" | "logs")}
        />

        {/* Sub-tabs for Rules: All | Active | Inactive */}
        {activeTab === "rules" && (
          <Tabs
            tabs={ruleStatusTabsWithCounts}
            activeTab={ruleStatusTabId}
            onTabChange={handleRuleStatusTabChange}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "rules" && automationEnabled && (
          <RecipeCards
            className="px-6 pt-4"
            items={presets.map((p) => {
              const Icon = PRESET_ICONS[p.icon];
              const needs =
                p.icon === "welcome" && greetingBot
                  ? `Chatbot "${greetingBot.name}" already greets new contacts — this would send a second welcome`
                  : p.needs;
              return { id: p.id, icon: <Icon className="h-4 w-4" />, title: p.title, summary: p.summary, needs };
            })}
            onPick={(id) => {
              setPreset(presets.find((p) => p.id === id) ?? null);
              setShowCreateModal(true);
            }}
          />
        )}
        {activeTab === "rules" ? (
          <AutomationRulesTable
            rules={rulesData?.data ?? []}
            total={rulesData?.total ?? 0}
            take={TAKE}
            skip={rulesPage * TAKE}
            isLoading={rulesLoading}
            onEnable={(id) => enableRule.mutate(id)}
            onDisable={(id) => disableRule.mutate(id)}
            onDelete={(id) => deleteRule.mutate(id)}
            onPageChange={setRulesPage}
            onCreateClick={() => setShowCreateModal(true)}
          />
        ) : (
          <ExecutionLogsTable
            logs={logsData?.data ?? []}
            total={logsData?.total ?? 0}
            take={TAKE}
            skip={logsPage * TAKE}
            isLoading={logsLoading}
            onPageChange={setLogsPage}
          />
        )}
      </div>

      {/* Create Modal */}
      <CreateAutomationRuleModal
        open={showCreateModal}
        preset={preset}
        onClose={() => {
          setShowCreateModal(false);
          setPreset(null);
        }}
      />
    </div>
  );
}
