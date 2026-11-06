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
  BulkContactAction,
  CreateSavedGroupsRequest,
  SplitSavedGroupsRequest,
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
  groups: ["contacts", "groups"] as const,
  savedGroups: ["contacts", "saved-groups"] as const,
  // Nested under savedGroups, so invalidating savedGroups refreshes these too
  ungroupedCount: ["contacts", "saved-groups", "ungrouped-count"] as const,
  moveImpact: (contactIds: string[], groupId?: string) =>
    ["contacts", "saved-groups", "move-impact", [...contactIds].sort().join(","), groupId ?? null] as const,
};

// ─── Query Hooks ───

export function useContacts(params?: ListContactsParams) {
  return useQuery({
    queryKey: contactKeys.list(params),
    queryFn: () => contactsApi.list(params),
  });
}

/** Contact counts per lead source and per scrape run */
export function useContactGroups() {
  return useQuery({
    queryKey: contactKeys.groups,
    queryFn: () => contactsApi.groups(),
  });
}

export function useSavedContactGroups(enabled = true) {
  return useQuery({
    queryKey: contactKeys.savedGroups,
    queryFn: () => contactsApi.savedGroups(),
    enabled,
    // Follow a running "Check numbers" until it finishes
    refetchInterval: (query) =>
      query.state.data?.some((g) => g.waCheck?.state === "running") ? 5_000 : false,
  });
}

/** How many contacts aren't in any saved group yet */
export function useUngroupedContactsCount(enabled = true) {
  return useQuery({
    queryKey: contactKeys.ungroupedCount,
    queryFn: () => contactsApi.ungroupedCount(),
    enabled,
  });
}

/** Live version of check-move: which groups these contacts are in (minus `groupId`). */
export function useSavedGroupMoveImpact(contactIds: string[], groupId?: string, enabled = true) {
  return useQuery({
    queryKey: contactKeys.moveImpact(contactIds, groupId),
    queryFn: () => contactsApi.checkSavedGroupMove({ contactIds, groupId }),
    enabled: enabled && contactIds.length > 0,
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

const BULK_VERB: Record<BulkContactAction["action"], string> = {
  status: "Status updated",
  assign: "Owner assigned",
  tags: "Tag added",
  delete: "Deleted",
};

export function useBulkContactAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkContactAction) => contactsApi.bulk(input),
    onSuccess: (res, input) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all });
      const ok = res.succeeded.length;
      const failed = res.failed.length;
      const noun = (n: number) => `${n} contact${n === 1 ? "" : "s"}`;
      if (failed === 0) {
        toast.success(`${BULK_VERB[input.action]} for ${noun(ok)}`);
      } else if (ok === 0) {
        toast.error(`Couldn't update ${noun(failed)}: ${res.failed[0].error}`);
      } else {
        toast.warning(`${BULK_VERB[input.action]} for ${noun(ok)} · ${failed} failed`);
      }
    },
    onError: (err: Error) => toast.error(err.message || "Bulk action failed"),
  });
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Save contacts as a group ("Name - 001", "Name - 002"… past `groupSize`). Contacts already
 * in another group move here; groups left empty are removed by the server.
 */
export function useCreateSavedContactGroups() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavedGroupsRequest) => contactsApi.createSavedGroups(input),
    onSuccess: ({ groups, movedFromGroups, skippedGrouped }) => {
      // Counts of the groups contacts moved out of change too (or those groups disappear);
      // this also refreshes the ungrouped count
      queryClient.invalidateQueries({ queryKey: contactKeys.savedGroups });
      queryClient.invalidateQueries({ queryKey: ["contacts", "list"] });
      const saved = groups.length === 1 ? `Created "${groups[0].name}"` : `Created ${plural(groups.length, "group")}`;
      toast.success(movedFromGroups > 0 ? `${saved} · ${plural(movedFromGroups, "contact")} moved` : saved, {
        description: skippedGrouped ? `${plural(skippedGrouped, "contact")} already in a group, left there` : undefined,
      });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save contact groups"),
  });
}

/** Split every ungrouped contact into "Group N" groups of `groupSize`. */
export function useSplitIntoSavedGroups() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SplitSavedGroupsRequest) => contactsApi.splitSavedGroups(input),
    onSuccess: ({ groups, remaining }) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.savedGroups });
      queryClient.invalidateQueries({ queryKey: ["contacts", "list"] });
      toast.success(groups.length === 1 ? `Created "${groups[0].name}"` : `Created ${plural(groups.length, "group")}`, {
        description: remaining > 0 ? `${remaining.toLocaleString()} left — create again` : undefined,
      });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to split contacts"),
  });
}

/** Read-only: which groups these contacts would leave. Used before save / move. */
export function useCheckSavedGroupMove() {
  return useMutation({
    mutationFn: (input: { contactIds: string[]; groupId?: string }) =>
      contactsApi.checkSavedGroupMove(input),
    onError: (err: Error) => toast.error(err.message || "Couldn't check contact groups"),
  });
}

/** Move contacts into a group, or out of every group (groupId null). */
export function useMoveToSavedGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { contactIds: string[]; groupId: string | null; groupName?: string }) =>
      contactsApi.moveToSavedGroup({ contactIds: input.contactIds, groupId: input.groupId }),
    onSuccess: ({ moved }, input) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.savedGroups });
      queryClient.invalidateQueries({ queryKey: ["contacts", "list"] });
      toast.success(
        input.groupId
          ? `Moved ${plural(moved, "contact")}${input.groupName ? ` to "${input.groupName}"` : ""}`
          : `Removed ${plural(moved, "contact")} from groups`,
      );
    },
    onError: (err: Error) => toast.error(err.message || "Failed to move contacts"),
  });
}

export function useRenameSavedGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
      contactsApi.renameSavedGroup(groupId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.savedGroups });
      toast.success("Group renamed");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to rename group"),
  });
}

/** Start or stop checking a group's numbers on WhatsApp (runs in the background) */
export function useGroupWaCheck() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: contactKeys.savedGroups });
  const start = useMutation({
    mutationFn: (groupId: string) => contactsApi.startGroupWaCheck(groupId),
    onSuccess: () => {
      refresh();
      toast.success("Checking numbers in the background");
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't start the check"),
  });
  const stop = useMutation({
    mutationFn: (groupId: string) => contactsApi.stopGroupWaCheck(groupId),
    onSuccess: refresh,
    onError: (err: Error) => toast.error(err.message || "Couldn't stop the check"),
  });
  return { start, stop };
}

export function useDeleteSavedGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => contactsApi.deleteSavedGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.savedGroups });
      queryClient.invalidateQueries({ queryKey: ["contacts", "list"] });
      toast.success("Group deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete group"),
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
