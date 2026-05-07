"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { contactsApi } from "@/lib/api/contacts";
import { useAuthStore } from "@/stores/auth-store";
import type {
  ListContactsParams,
  CreateContactRequest,
  UpdateContactRequest,
  ChangeLeadStatusRequest,
  AssignContactRequest,
  MergeContactsRequest,
  AddNoteRequest,
  AddTagRequest,
} from "@/lib/types/contacts";

// ─── Query Key Factory ───

export const contactKeys = {
  all: ["contacts"] as const,
  list: (params?: ListContactsParams) =>
    ["contacts", "list", params] as const,
  detail: (contactId: string) => ["contacts", contactId] as const,
  notes: (contactId: string) => ["contacts", contactId, "notes"] as const,
  tags: (contactId: string) => ["contacts", contactId, "tags"] as const,
  statusHistory: (contactId: string) =>
    ["contacts", contactId, "status-history"] as const,
  ownerHistory: (contactId: string) =>
    ["contacts", contactId, "owner-history"] as const,
  orgTags: ["contacts", "org-tags"] as const,
  orgMembers: ["contacts", "org-members"] as const,
};

// ─── Query Hooks ───

export function useContacts(params?: ListContactsParams) {
  return useQuery({
    queryKey: contactKeys.list(params),
    queryFn: () => contactsApi.list(params),
  });
}

export function useContact(contactId: string | null) {
  return useQuery({
    queryKey: contactKeys.detail(contactId!),
    queryFn: () => contactsApi.get(contactId!),
    enabled: !!contactId,
  });
}

export function useContactByPhone(phone: string | null) {
  return useQuery({
    queryKey: ["contacts", "byPhone", phone],
    queryFn: () => contactsApi.findByPhone(phone!),
    enabled: !!phone,
  });
}

export function useContactNotes(contactId: string | null) {
  return useQuery({
    queryKey: contactKeys.notes(contactId!),
    queryFn: () => contactsApi.getNotes(contactId!),
    enabled: !!contactId,
  });
}

export function useStatusHistory(contactId: string | null) {
  return useQuery({
    queryKey: contactKeys.statusHistory(contactId!),
    queryFn: () => contactsApi.getStatusHistory(contactId!),
    enabled: !!contactId,
  });
}

export function useOwnerHistory(contactId: string | null) {
  return useQuery({
    queryKey: contactKeys.ownerHistory(contactId!),
    queryFn: () => contactsApi.getOwnerHistory(contactId!),
    enabled: !!contactId,
  });
}

export function useOrgTags() {
  return useQuery({
    queryKey: contactKeys.orgTags,
    queryFn: () => contactsApi.listOrgTags(),
  });
}

export function useOrgMembers() {
  const role = useAuthStore((s) => s.user?.role);
  return useQuery({
    queryKey: contactKeys.orgMembers,
    queryFn: () => contactsApi.listOrgMembers(),
    enabled: role === "ADMIN" || role === "MANAGER",
  });
}

// ─── Mutation Hooks ───

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContactRequest) => contactsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: contactKeys.all }); toast.success("Contact created"); },
    onError: (err: Error) => toast.error(err.message || "Failed to create contact"),
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      ...data
    }: { contactId: string } & UpdateContactRequest) =>
      contactsApi.update(contactId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all });
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(variables.contactId) });
      toast.success("Contact updated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update contact"),
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => contactsApi.delete(contactId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: contactKeys.all }); toast.success("Contact deleted"); },
    onError: (err: Error) => toast.error(err.message || "Failed to delete contact"),
  });
}

export function useChangeLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      ...data
    }: { contactId: string } & ChangeLeadStatusRequest) =>
      contactsApi.changeStatus(contactId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all });
      queryClient.invalidateQueries({
        queryKey: contactKeys.detail(variables.contactId),
      });
      queryClient.invalidateQueries({
        queryKey: contactKeys.statusHistory(variables.contactId),
      });
    },
  });
}

export function useAssignContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      ...data
    }: { contactId: string } & AssignContactRequest) =>
      contactsApi.assign(contactId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all });
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(variables.contactId) });
      queryClient.invalidateQueries({ queryKey: contactKeys.ownerHistory(variables.contactId) });
      toast.success("Owner assigned");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to assign owner"),
  });
}

export function useMergeContacts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MergeContactsRequest) => contactsApi.merge(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: contactKeys.all }); toast.success("Contacts merged"); },
    onError: (err: Error) => toast.error(err.message || "Failed to merge contacts"),
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      ...data
    }: { contactId: string } & AddNoteRequest) =>
      contactsApi.addNote(contactId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: contactKeys.notes(variables.contactId),
      });
      queryClient.invalidateQueries({
        queryKey: contactKeys.detail(variables.contactId),
      });
    },
  });
}

export function useAddTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      ...data
    }: { contactId: string } & AddTagRequest) =>
      contactsApi.addTag(contactId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: contactKeys.tags(variables.contactId),
      });
      queryClient.invalidateQueries({
        queryKey: contactKeys.detail(variables.contactId),
      });
      queryClient.invalidateQueries({ queryKey: contactKeys.orgTags });
    },
  });
}

export function useRemoveTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      tagId,
    }: {
      contactId: string;
      tagId: string;
    }) => contactsApi.removeTag(contactId, tagId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: contactKeys.tags(variables.contactId),
      });
      queryClient.invalidateQueries({
        queryKey: contactKeys.detail(variables.contactId),
      });
    },
  });
}

export function useImportContacts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (csv: string) => contactsApi.importCsv(csv),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all });
    },
  });
}

export function useExportContacts() {
  return useMutation({
    mutationFn: () => contactsApi.exportCsv(),
    onError: (err: Error) => toast.error(err.message || "Export failed"),
    onSuccess: (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
