"use client";

import { create } from "zustand";
import type {
  AutomationTriggerType,
  AutomationRuleStatus,
  AutomationExecutionStatus,
} from "@/lib/types/automation";

interface AutomationState {
  // Rules list
  selectedRuleId: string | null;
  filterTriggerType: AutomationTriggerType | null;
  filterStatus: AutomationRuleStatus | null;
  rulesPage: number;
  showCreateModal: boolean;

  // Logs
  filterLogStatus: AutomationExecutionStatus | null;
  filterLogRuleId: string | null;
  logsPage: number;

  // Active tab
  activeTab: "rules" | "logs";

  // Actions
  setSelectedRule: (id: string | null) => void;
  setFilterTriggerType: (type: AutomationTriggerType | null) => void;
  setFilterStatus: (status: AutomationRuleStatus | null) => void;
  setRulesPage: (page: number) => void;
  setShowCreateModal: (open: boolean) => void;
  setFilterLogStatus: (status: AutomationExecutionStatus | null) => void;
  setFilterLogRuleId: (ruleId: string | null) => void;
  setLogsPage: (page: number) => void;
  setActiveTab: (tab: "rules" | "logs") => void;
  clearFilters: () => void;
}

export const useAutomationStore = create<AutomationState>()((set) => ({
  selectedRuleId: null,
  filterTriggerType: null,
  filterStatus: null,
  rulesPage: 0,
  showCreateModal: false,
  filterLogStatus: null,
  filterLogRuleId: null,
  logsPage: 0,
  activeTab: "rules",

  setSelectedRule: (id) => set({ selectedRuleId: id }),
  setFilterTriggerType: (type) =>
    set({ filterTriggerType: type, rulesPage: 0 }),
  setFilterStatus: (status) => set({ filterStatus: status, rulesPage: 0 }),
  setRulesPage: (page) => set({ rulesPage: page }),
  setShowCreateModal: (open) => set({ showCreateModal: open }),
  setFilterLogStatus: (status) =>
    set({ filterLogStatus: status, logsPage: 0 }),
  setFilterLogRuleId: (ruleId) =>
    set({ filterLogRuleId: ruleId, logsPage: 0 }),
  setLogsPage: (page) => set({ logsPage: page }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  clearFilters: () =>
    set({
      filterTriggerType: null,
      filterStatus: null,
      rulesPage: 0,
      filterLogStatus: null,
      filterLogRuleId: null,
      logsPage: 0,
    }),
}));
