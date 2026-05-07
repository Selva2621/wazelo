"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { automationKeys } from "./use-automation";
import { schedulerKeys } from "./use-scheduler";

/**
 * Subscribes to automation & scheduler WebSocket events for real-time updates.
 *
 * Events handled:
 * - automation:rule:created     → invalidate rules list
 * - automation:rule:updated     → invalidate rules list + detail
 * - automation:rule:enabled     → invalidate rules list + detail
 * - automation:rule:disabled    → invalidate rules list + detail
 * - automation:rule:deleted     → invalidate rules list
 * - automation:execution:started    → invalidate logs
 * - automation:execution:completed  → invalidate logs
 * - automation:execution:failed     → invalidate logs
 * - scheduler:message:sent      → invalidate scheduled messages
 * - scheduler:message:failed    → invalidate scheduled messages
 * - scheduler:message:cancelled → invalidate scheduled messages
 */
export function useAutomationSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);

    // ─── Automation Rule Events ───

    const onRuleChange = (payload: { ruleId: string; orgId: string }) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules });
      queryClient.invalidateQueries({
        queryKey: automationKeys.ruleDetail(payload.ruleId),
      });
    };

    const onRuleListChange = () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules });
    };

    // ─── Execution Events ───

    const onExecutionChange = () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.logs });
    };

    // ─── Scheduler Events ───

    const onSchedulerChange = (payload: {
      messageId: string;
      orgId: string;
    }) => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.all });
      queryClient.invalidateQueries({
        queryKey: schedulerKeys.detail(payload.messageId),
      });
    };

    // Subscribe
    socket.on("automation:rule:created", onRuleListChange);
    socket.on("automation:rule:updated", onRuleChange);
    socket.on("automation:rule:enabled", onRuleChange);
    socket.on("automation:rule:disabled", onRuleChange);
    socket.on("automation:rule:deleted", onRuleListChange);
    socket.on("automation:execution:started", onExecutionChange);
    socket.on("automation:execution:completed", onExecutionChange);
    socket.on("automation:execution:failed", onExecutionChange);
    socket.on("scheduler:message:sent", onSchedulerChange);
    socket.on("scheduler:message:failed", onSchedulerChange);
    socket.on("scheduler:message:cancelled", onSchedulerChange);

    return () => {
      socket.off("automation:rule:created", onRuleListChange);
      socket.off("automation:rule:updated", onRuleChange);
      socket.off("automation:rule:enabled", onRuleChange);
      socket.off("automation:rule:disabled", onRuleChange);
      socket.off("automation:rule:deleted", onRuleListChange);
      socket.off("automation:execution:started", onExecutionChange);
      socket.off("automation:execution:completed", onExecutionChange);
      socket.off("automation:execution:failed", onExecutionChange);
      socket.off("scheduler:message:sent", onSchedulerChange);
      socket.off("scheduler:message:failed", onSchedulerChange);
      socket.off("scheduler:message:cancelled", onSchedulerChange);
    };
  }, [accessToken, queryClient]);
}
