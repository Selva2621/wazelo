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
