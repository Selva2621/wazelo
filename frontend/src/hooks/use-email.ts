"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emailApi, type EmailTemplate, type SaveEmailAccountInput } from "@/lib/api/email";

export const emailKeys = {
  account: ["email", "account"] as const,
  recent: ["email", "recent"] as const,
  templates: ["email", "templates"] as const,
};

/** The workspace's business email (null when none is connected) */
export function useEmailAccount(options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: emailKeys.account, queryFn: emailApi.getAccount, enabled: options.enabled ?? true });
}

export function useSaveEmailAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveEmailAccountInput) => emailApi.saveAccount(input),
    onSuccess: (data) => qc.setQueryData(emailKeys.account, data),
  });
}

export function useSendTestEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (to?: string) => emailApi.sendTest(to),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: emailKeys.account });
      void qc.invalidateQueries({ queryKey: emailKeys.recent });
    },
  });
}

export function useDisconnectEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: emailApi.disconnect,
    onSuccess: () => qc.setQueryData(emailKeys.account, null),
  });
}

export function useRecentEmails(enabled = true) {
  return useQuery({ queryKey: emailKeys.recent, queryFn: emailApi.recent, enabled, refetchInterval: 30_000 });
}

export function useEmailTemplates() {
  return useQuery({ queryKey: emailKeys.templates, queryFn: emailApi.listTemplates });
}

export function useSaveEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...t }: Pick<EmailTemplate, "name" | "subject" | "body"> & { id?: string }) =>
      id ? emailApi.updateTemplate(id, t) : emailApi.createTemplate(t),
    onSuccess: () => qc.invalidateQueries({ queryKey: emailKeys.templates }),
  });
}

/** Write with AI: fills subject + message; nothing is saved until the member saves */
export function useGenerateEmailTemplate() {
  return useMutation({ mutationFn: (prompt: string) => emailApi.generateEmailTemplate(prompt) });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailApi.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: emailKeys.templates }),
  });
}
