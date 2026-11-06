import apiClient from "./client";
import type {
  Contact,
  ContactListResponse,
  ContactNote,
  NotesListResponse,
  ContactStatusHistoryEntry,
  ContactOwnerHistoryEntry,
  ContactTag,
  Tag,
  CreateContactRequest,
  UpdateContactRequest,
  ChangeLeadStatusRequest,
  AssignContactRequest,
  MergeContactsRequest,
  AddNoteRequest,
  AddTagRequest,
  ListContactsParams,
  OrgMember,
  BulkContactAction,
  BulkContactsResult,
  ContactGroups,
  SavedContactGroup,
  CreateSavedGroupsRequest,
  CreateSavedGroupsResult,
  SplitSavedGroupsRequest,
  SplitSavedGroupsResult,
  SavedGroupMoveImpact,
} from "@/lib/types/contacts";

export const contactsApi = {
  // ─── CRUD ───

  create: (data: CreateContactRequest) =>
    apiClient.post<Contact>("/contacts", data).then((r) => r.data),

  list: (params?: ListContactsParams) =>
    apiClient
      .get<ContactListResponse>("/contacts", {
        params: {
          ...params,
          tagIds: params?.tagIds?.join(","),
        },
      })
      .then((r) => r.data),

  groups: () =>
    apiClient.get<ContactGroups>("/contacts/groups").then((r) => r.data),

  savedGroups: () =>
    apiClient.get<SavedContactGroup[]>("/contacts/saved-groups").then((r) => r.data),

  createSavedGroups: (data: CreateSavedGroupsRequest) =>
    apiClient
      .post<CreateSavedGroupsResult>("/contacts/saved-groups", data)
      .then((r) => r.data),

  /** Visible, not opted-out contacts that aren't in any group */
  ungroupedCount: () =>
    apiClient
      .get<{ count: number }>("/contacts/saved-groups/ungrouped-count")
      .then((r) => r.data.count),

  splitSavedGroups: (data: SplitSavedGroupsRequest) =>
    apiClient
      .post<SplitSavedGroupsResult>("/contacts/saved-groups/split", data)
      .then((r) => r.data),

  checkSavedGroupMove: (data: { contactIds: string[]; groupId?: string }) =>
    apiClient
      .post<SavedGroupMoveImpact>("/contacts/saved-groups/check-move", data)
      .then((r) => r.data),

  /** groupId null takes the contacts out of every group */
  moveToSavedGroup: (data: { contactIds: string[]; groupId: string | null }) =>
    apiClient
      .post<{ moved: number }>("/contacts/saved-groups/move", data)
      .then((r) => r.data),

  renameSavedGroup: (groupId: string, name: string) =>
    apiClient
      .patch<SavedContactGroup>(`/contacts/saved-groups/${groupId}`, { name })
      .then((r) => r.data),

  /** Start the background "on WhatsApp?" check of a group's numbers */
  startGroupWaCheck: (groupId: string) =>
    apiClient
      .post<{ state: string }>(`/contacts/saved-groups/${groupId}/wa-check`)
      .then((r) => r.data),
  stopGroupWaCheck: (groupId: string) =>
    apiClient.post(`/contacts/saved-groups/${groupId}/wa-check/stop`).then(() => undefined),
  deleteSavedGroup: (groupId: string) =>
    apiClient
      .delete<{ deleted: boolean }>(`/contacts/saved-groups/${groupId}`)
      .then((r) => r.data),

  get: (contactId: string) =>
    apiClient.get<Contact>(`/contacts/${contactId}`).then((r) => r.data),

  update: (contactId: string, data: UpdateContactRequest) =>
    apiClient
      .patch<Contact>(`/contacts/${contactId}`, data)
      .then((r) => r.data),

  delete: (contactId: string) =>
    apiClient.delete(`/contacts/${contactId}`).then((r) => r.data),

  // ─── Lead Status ───

  changeStatus: (contactId: string, data: ChangeLeadStatusRequest) =>
    apiClient
      .patch<Contact>(`/contacts/${contactId}/status`, data)
      .then((r) => r.data),

  getStatusHistory: (contactId: string) =>
    apiClient
      .get<ContactStatusHistoryEntry[]>(
        `/contacts/${contactId}/status-history`,
      )
      .then((r) => r.data),

  // ─── Owner Assignment ───

  assign: (contactId: string, data: AssignContactRequest) =>
    apiClient
      .patch<Contact>(`/contacts/${contactId}/assign`, data)
      .then((r) => r.data),

  getOwnerHistory: (contactId: string) =>
    apiClient
      .get<ContactOwnerHistoryEntry[]>(`/contacts/${contactId}/owner-history`)
      .then((r) => r.data),

  // ─── Merge ───

  merge: (data: MergeContactsRequest) =>
    apiClient.post<Contact>("/contacts/merge", data).then((r) => r.data),

  // ─── Notes ───

  addNote: (contactId: string, data: AddNoteRequest) =>
    apiClient
      .post<ContactNote>(`/contacts/${contactId}/notes`, data)
      .then((r) => r.data),

  getNotes: (contactId: string, params?: { take?: number; skip?: number }) =>
    apiClient
      .get<NotesListResponse>(`/contacts/${contactId}/notes`, { params })
      .then((r) => r.data),

  // ─── Tags ───

  addTag: (contactId: string, data: AddTagRequest) =>
    apiClient
      .post<Tag>(`/contacts/${contactId}/tags`, data)
      .then((r) => r.data),

  removeTag: (contactId: string, tagId: string) =>
    apiClient
      .delete(`/contacts/${contactId}/tags/${tagId}`)
      .then((r) => r.data),

  getContactTags: (contactId: string) =>
    apiClient
      .get<ContactTag[]>(`/contacts/${contactId}/tags`)
      .then((r) => r.data),

  listOrgTags: () =>
    apiClient.get<Tag[]>("/contacts/tags/list").then((r) => r.data),

  // ─── Bulk actions ───

  bulk: ({ action, ...body }: BulkContactAction) =>
    apiClient
      .post<BulkContactsResult>(`/contacts/bulk/${action}`, body)
      .then((r) => r.data),

  // ─── Lookup by phone ───

  findByPhone: (phone: string): Promise<Contact | null> =>
    apiClient
      .get<ContactListResponse>("/contacts", {
        params: { search: phone, take: 1 },
      })
      .then((r) => r.data.contacts[0] ?? null),

  // ─── Import / Export ───

  exportCsv: () =>
    apiClient
      .get("/contacts/export", { responseType: "blob" })
      .then((r) => r.data),

  importCsv: (csv: string) =>
    apiClient
      .post<{ imported: number; skipped: number; errors: string[] }>(
        "/contacts/import",
        { csv },
      )
      .then((r) => r.data),

  // ─── Org Members (for owner assignment) ───

  listOrgMembers: () =>
    apiClient.get("/users").then((r) => {
      const data = r.data as { users?: OrgMember[] };
      return data.users ?? [];
    }),
};
