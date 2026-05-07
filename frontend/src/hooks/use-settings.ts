"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import type {
  UpdateOrgSettingsRequest,
  UpdateWhatsAppConfigRequest,
  WorkingHoursConfig,
  UpdateFeatureFlagsRequest,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  CreateIntegrationConfigRequest,
  UpdateIntegrationConfigRequest,
} from "@/lib/types/settings";

// ─── Query Key Factory ───

export const settingsKeys = {
  all: ["settings"] as const,
  org: () => ["settings", "org"] as const,
  aiMemory: () => ["settings", "ai-memory"] as const,
  whatsapp: () => ["settings", "whatsapp"] as const,
  workingHours: () => ["settings", "working-hours"] as const,
  features: () => ["settings", "features"] as const,
  webhooks: () => ["settings", "webhooks"] as const,
  webhook: (id: string) => ["settings", "webhooks", id] as const,
  webhookDeliveries: (id: string) =>
    ["settings", "webhooks", id, "deliveries"] as const,
  integrations: () => ["settings", "integrations"] as const,
  integration: (id: string) => ["settings", "integrations", id] as const,
};

// ─── Query Hooks ───

export function useOrgSettings() {
  return useQuery({
    queryKey: settingsKeys.org(),
    queryFn: () => settingsApi.getOrgSettings(),
  });
}

export function useWhatsAppConfig() {
  return useQuery({
    queryKey: settingsKeys.whatsapp(),
    queryFn: () => settingsApi.getWhatsAppConfig(),
  });
}

export function useWorkingHours() {
  return useQuery({
    queryKey: settingsKeys.workingHours(),
    queryFn: () => settingsApi.getWorkingHours(),
    retry: false,
  });
}

export function useUpdateWorkingHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WorkingHoursConfig) => settingsApi.updateWorkingHours(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.workingHours() }),
  });
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: settingsKeys.features(),
    queryFn: () => settingsApi.getFeatureFlags(),
  });
}

export function useWebhooks() {
  return useQuery({
    queryKey: settingsKeys.webhooks(),
    queryFn: () => settingsApi.listWebhooks(),
  });
}

export function useWebhookDeliveries(
  webhookId: string,
  params?: { status?: string; eventType?: string; limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: [...settingsKeys.webhookDeliveries(webhookId), params],
    queryFn: () => settingsApi.listWebhookDeliveries(webhookId, params),
    enabled: !!webhookId,
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: settingsKeys.integrations(),
    queryFn: () => settingsApi.listIntegrations(),
  });
}

// ─── Mutation Hooks ───

export function useUpdateOrgSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateOrgSettingsRequest) =>
      settingsApi.updateOrgSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.org() });
    },
  });
}

export function useUpdateWhatsAppConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateWhatsAppConfigRequest) =>
      settingsApi.updateWhatsAppConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.whatsapp() });
    },
  });
}

export function useUpdateFeatureFlags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateFeatureFlagsRequest) =>
      settingsApi.updateFeatureFlags(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.features() });
    },
  });
}

// Notification preferences now managed via useNotificationPreferences / useUpdateNotificationPreference
// from @/hooks/use-notifications

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWebhookRequest) =>
      settingsApi.createWebhook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.webhooks() });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      webhookId,
      ...data
    }: { webhookId: string } & UpdateWebhookRequest) =>
      settingsApi.updateWebhook(webhookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.webhooks() });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (webhookId: string) => settingsApi.deleteWebhook(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.webhooks() });
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (webhookId: string) => settingsApi.testWebhook(webhookId),
  });
}

// ─── Integration Hooks (EPIC 12) ───

export function useCreateIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateIntegrationConfigRequest) =>
      settingsApi.createIntegration(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.integrations(),
      });
    },
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & UpdateIntegrationConfigRequest) =>
      settingsApi.updateIntegration(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.integrations(),
      });
    },
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.integrations(),
      });
    },
  });
}

export function useTestIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.testIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.integrations(),
      });
    },
  });
}

export function useAiMemory() {
  return useQuery({
    queryKey: settingsKeys.aiMemory(),
    queryFn: () => settingsApi.getAiMemory(),
  });
}

export function useRebuildAiMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.rebuildAiMemory(),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.aiMemory() }),
  });
}

export function useUpdateAiMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { customContext?: string }) =>
      settingsApi.updateAiMemory(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.aiMemory() }),
  });
}

export function useUploadAiMemoryDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => settingsApi.uploadAiMemoryDocument(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.aiMemory() }),
  });
}

export function useDeleteAiMemoryDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.deleteAiMemoryDocument(),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.aiMemory() }),
  });
}
